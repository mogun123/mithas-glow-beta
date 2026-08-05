"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, Clock, DollarSign, Star, Users, TrendingUp, 
  CheckCircle, XCircle, AlertCircle, Briefcase, MessageSquare,
  ChevronRight, Plus, Edit2, Trash2
} from "lucide-react";
import { useProfessionalStatus, useDashboardStats, useProfessionalBookings, useUpdateBookingStatus } from "@/hooks/use-professional-dashboard";
import { Header } from "@/src/components/Header";
import { BottomNav } from "@/src/components/BottomNav";

// Mock user ID - replace with actual auth
const USER_ID = "current-user-id";

export default function ProfessionalDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "confirmed" | "completed" | "cancelled">("all");
  
  const { isProfessional, profile, loading: statusLoading } = useProfessionalStatus(USER_ID);
  const { stats, loading: statsLoading } = useDashboardStats(USER_ID);
  const { bookings, loading: bookingsLoading, refetch } = useProfessionalBookings(USER_ID, activeTab === "all" ? undefined : activeTab);
  const { updateStatus } = useUpdateBookingStatus();

  // Redirect if not a professional
  useEffect(() => {
    if (!statusLoading && !isProfessional) {
      // Could redirect to become professional page or show error
      console.log("User is not a professional makeup artist");
    }
  }, [isProfessional, statusLoading]);

  const handleAcceptBooking = async (bookingId: string) => {
    const success = await updateStatus(bookingId, "confirmed");
    if (success) refetch();
  };

  const handleDeclineBooking = async (bookingId: string) => {
    const success = await updateStatus(bookingId, "cancelled");
    if (success) refetch();
  };

  const handleCompleteBooking = async (bookingId: string) => {
    const success = await updateStatus(bookingId, "completed");
    if (success) refetch();
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="glass-header sticky top-0 z-30">
        <Header onNavigateToProfile={() => router.push("/profile")} />
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-20">
        {/* Welcome Section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back, {profile?.shop_name || profile?.full_name || "Professional"}
          </h1>
          <p className="text-sm text-gray-600">
            Here's what's happening with your business today
          </p>
        </div>

        {/* Stats Grid */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-[#D4AF37]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="w-5 h-5 text-[#D4AF37]" />
                  <span className="text-2xl font-bold">{stats?.todayBookings || 0}</span>
                </div>
                <p className="text-xs text-gray-600">Today's Bookings</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  <span className="text-2xl font-bold">{stats?.pendingRequests || 0}</span>
                </div>
                <p className="text-xs text-gray-600">Pending Requests</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <span className="text-lg font-bold">₹{stats?.todaysEarnings?.toLocaleString() || 0}</span>
                </div>
                <p className="text-xs text-gray-600">Today's Earnings</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Star className="w-5 h-5 text-purple-500" />
                  <span className="text-2xl font-bold">{stats?.averageRating || 0}</span>
                </div>
                <p className="text-xs text-gray-600">Average Rating</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Secondary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{stats?.upcomingAppointments || 0}</p>
              <p className="text-xs text-gray-600">Upcoming</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{stats?.completedToday || 0}</p>
              <p className="text-xs text-gray-600">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{stats?.totalReviews || 0}</p>
              <p className="text-xs text-gray-600">Reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col gap-2"
            onClick={() => router.push("/professional/services")}
          >
            <Briefcase className="w-5 h-5" />
            <span className="text-xs">Manage Services</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col gap-2"
            onClick={() => router.push("/professional/portfolio")}
          >
            <Edit2 className="w-5 h-5" />
            <span className="text-xs">Portfolio</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col gap-2"
            onClick={() => router.push("/professional/availability")}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs">Availability</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-3 flex flex-col gap-2"
            onClick={() => router.push("/professional/analytics")}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-xs">Analytics</span>
          </Button>
        </div>

        {/* Bookings Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Booking Management</CardTitle>
              <Badge variant="outline">{bookings.length} bookings</Badge>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab
                      ? "bg-[#D4AF37] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </CardHeader>
          
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No bookings found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center text-xl flex-shrink-0">
                        {booking.customer?.avatar_url ? (
                          <img src={booking.customer.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          "👤"
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {booking.customer?.full_name || "Customer"}
                          </h4>
                          <Badge
                            className={`text-xs ${
                              booking.status === "pending" ? "bg-orange-100 text-orange-800" :
                              booking.status === "confirmed" ? "bg-blue-100 text-blue-800" :
                              booking.status === "completed" ? "bg-green-100 text-green-800" :
                              "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {booking.status}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{booking.service_name || "Service"}</p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(booking.booking_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {booking.booking_time}
                          </div>
                          {booking.total_price && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              ₹{booking.total_price.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      {booking.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleAcceptBooking(booking.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleDeclineBooking(booking.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}
                      {booking.status === "confirmed" && (
                        <Button
                          size="sm"
                          className="flex-1 bg-[#D4AF37] hover:bg-[#B8962E]"
                          onClick={() => handleCompleteBooking(booking.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Complete
                        </Button>
                      )}
                      {booking.status === "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => router.push(`/professional/bookings/${booking.id}`)}
                        >
                          View Details
                        </Button>
                      )}
                      {booking.status === "cancelled" && (
                        <Badge variant="outline" className="w-full justify-center">Cancelled</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <div className="glass-nav fixed bottom-0 left-0 right-0 z-30">
        <BottomNav
          onNavigateHome={() => router.push("/")}
          onNavigateToMirror={() => router.push("/ai-mirror")}
          onNavigateToProfile={() => router.push("/profile")}
        />
      </div>
    </div>
  );
}
