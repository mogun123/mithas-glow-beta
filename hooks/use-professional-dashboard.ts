import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ProfessionalProfile {
  id: string;
  email: string;
  full_name: string | null;
  shop_name: string | null;
  bio: string | null;
  experience: string | null;
  city: string | null;
  avatar_url: string | null;
  role: string | null;  // CRITICAL SCHEMA FIX: Use 'role' instead of 'account_type'
  industry: string | null;
  seller_status: string | null;
  is_active: boolean;
  portfolio_link: string | null;
  operating_hours: string | null;
}

export interface BookingWithDetails {
  id: string;
  customer_id: string;
  artist_id: string;
  service_name: string | null;
  total_price: number | null;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  created_at: string;
  customer?: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
}

export interface ArtistService {
  id: string;
  artist_id: string;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string | null;
  is_active: boolean;
  images: any | null;
}

export interface DashboardStats {
  todayBookings: number;
  pendingRequests: number;
  upcomingAppointments: number;
  completedToday: number;
  todaysEarnings: number;
  monthlyEarnings: number;
  averageRating: number;
  totalReviews: number;
  profileCompletion: number;
  portfolioViews: number;
}

/**
 * Check if current user is a professional makeup artist
 */
export const useProfessionalStatus = (userId: string) => {
  const [isProfessional, setIsProfessional] = useState(false);
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setLoading(true);
        // CRITICAL SCHEMA FIX: Use 'role' field instead of 'account_type'
        const { data, error: queryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .eq('role', 'seller')  // Fixed: use 'seller' instead of 'professional'
          .eq('industry', 'makeup_artist')
          .single();

        if (queryError) throw queryError;
        
        setIsProfessional(!!data);
        setProfile(data);
      } catch (err: any) {
        setError(err.message);
        setIsProfessional(false);
      } finally {
        setLoading(false);
      }
    };

    if (userId) checkStatus();
  }, [userId]);

  return { isProfessional, profile, loading, error };
};

/**
 * Get dashboard statistics for professional
 */
export const useDashboardStats = (artistId: string) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        // Today's bookings
        const { data: todayBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .eq('artist_id', artistId)
          .eq('booking_date', today);

        // Pending requests
        const { data: pending } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .eq('artist_id', artistId)
          .eq('status', 'pending');

        // Upcoming appointments
        const { data: upcoming } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .eq('artist_id', artistId)
          .in('status', ['confirmed', 'pending'])
          .gte('booking_date', today);

        // Completed today
        const { data: completed } = await supabase
          .from('bookings')
          .select('*', { count: 'exact' })
          .eq('artist_id', artistId)
          .eq('status', 'completed')
          .eq('booking_date', today);

        // Today's earnings
        const { data: earningsData } = await supabase
          .from('bookings')
          .select('total_price')
          .eq('artist_id', artistId)
          .eq('status', 'completed')
          .eq('booking_date', today);

        // Monthly earnings
        const { data: monthlyData } = await supabase
          .from('bookings')
          .select('total_price')
          .eq('artist_id', artistId)
          .eq('status', 'completed')
          .gte('booking_date', firstOfMonth);

        // Reviews
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('artist_id', artistId);

        const totalRevenue = earningsData?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
        const monthlyRevenue = monthlyData?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
        const avgRating = reviews && reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;

        setStats({
          todayBookings: todayBookings?.length || 0,
          pendingRequests: pending?.length || 0,
          upcomingAppointments: upcoming?.length || 0,
          completedToday: completed?.length || 0,
          todaysEarnings: totalRevenue,
          monthlyEarnings: monthlyRevenue,
          averageRating: parseFloat(avgRating.toFixed(1)),
          totalReviews: reviews?.length || 0,
          profileCompletion: 85, // Calculate based on profile fields
          portfolioViews: 0, // Would need analytics table
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (artistId) fetchStats();
  }, [artistId]);

  return { stats, loading, error };
};

/**
 * Get bookings for professional with filtering
 */
export const useProfessionalBookings = (artistId: string, status?: string) => {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!bookings_customer_id_fkey(full_name, phone, avatar_url)
        `)
        .eq('artist_id', artistId)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      setBookings(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [artistId, status]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
};

/**
 * Update booking status
 */
export const useUpdateBookingStatus = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback(async (
    bookingId: string,
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  ) => {
    try {
      setLoading(true);
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bookingId);

      if (updateError) throw updateError;
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateStatus, loading, error };
};

/**
 * Get artist services
 */
export const useArtistServices = (artistId: string) => {
  const [services, setServices] = useState<ArtistService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from('artist_services')
        .select('*')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;
      setServices(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  return { services, loading, error, refetch: fetchServices };
};

/**
 * Add a new artist service
 */
export const useAddArtistService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addService = useCallback(async (
    artistId: string,
    service: Omit<ArtistService, 'id' | 'created_at'>
  ) => {
    try {
      setLoading(true);
      const { data, error: insertError } = await supabase
        .from('artist_services')
        .insert({
          ...service,
          artist_id: artistId,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { addService, loading, error };
};

/**
 * Update an existing artist service
 */
export const useUpdateArtistService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateService = useCallback(async (
    serviceId: string,
    updates: Partial<ArtistService>
  ) => {
    try {
      setLoading(true);
      const { data, error: updateError } = await supabase
        .from('artist_services')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateService, loading, error };
};

/**
 * Delete an artist service
 */
export const useDeleteArtistService = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteService = useCallback(async (serviceId: string) => {
    try {
      setLoading(true);
      const { error: deleteError } = await supabase
        .from('artist_services')
        .delete()
        .eq('id', serviceId);

      if (deleteError) throw deleteError;
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteService, loading, error };
};