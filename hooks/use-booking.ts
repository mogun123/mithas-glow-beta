import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '../types/profile';

export interface Artist extends Profile {
  average_rating?: number;
  total_reviews?: number;
  distance_km?: number;
  starting_price?: number;
}

export interface BookingSlot {
  time: string;
  available: boolean;
}

export interface Booking {
  id: string;
  customer_id: string;
  artist_id: string;
  service_id?: string;
  service_name?: string;
  total_price?: number;
  booking_date: string;
  booking_time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_id?: string;
  created_at: string;
}

export interface ArtistService {
  id: string;
  artist_id: string;
  title: string;
  description?: string;
  price: number;
  duration_minutes: number;
  category: 'bridal' | 'party' | 'home_service';
  is_active: boolean;
}

/**
 * Fetch verified makeup artists from Supabase
 */
export const useVerifiedArtists = (options?: {
  limit?: number;
  sortBy?: 'rating' | 'nearby' | 'trending' | 'price';
  userLat?: number;
  userLng?: number;
  category?: string;
}) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('profiles')
          .select(`
            *,
            artist_services!artist_services_artist_id_fkey(price),
            reviews!reviews_artist_id_fkey(rating)
          `)
          .eq('account_type', 'professional')
          .eq('industry', 'makeup_artist')
          .eq('seller_status', 'verified')
          .eq('is_active', true);

        // Filter by category if provided
        if (options?.category) {
          query = query.eq('artist_services.category', options.category);
        }

        // Execute query
        const { data, error: queryError } = await query;

        if (queryError) throw queryError;

        // Process data to calculate aggregates
        const processedArtists = data?.map(artist => {
          const ratings = artist.reviews?.map((r: any) => r.rating) || [];
          const avgRating = ratings.length > 0
            ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
            : null;

          const services = artist.artist_services || [];
          const minPrice = services.length > 0
            ? Math.min(...services.map((s: any) => s.price))
            : null;

          return {
            ...artist,
            average_rating: avgRating,
            total_reviews: ratings.length,
            starting_price: minPrice,
          };
        }) || [];

        // Sort results
        const sortedArtists = [...processedArtists].sort((a, b) => {
          switch (options?.sortBy) {
            case 'rating':
              return (b.average_rating || 0) - (a.average_rating || 0);
            case 'price':
              return (a.starting_price || Infinity) - (b.starting_price || Infinity);
            case 'trending':
              return (b.total_reviews || 0) - (a.total_reviews || 0);
            case 'nearby':
            default:
              // Distance calculation would require lat/lng and PostGIS
              // For now, return as-is or implement Haversine formula in JS
              return 0;
          }
        });

        // Apply limit
        const limitedArtists = options?.limit
          ? sortedArtists.slice(0, options.limit)
          : sortedArtists;

        setArtists(limitedArtists);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch artists');
        console.error('Error fetching artists:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtists();
  }, [options?.limit, options?.sortBy, options?.category]);

  return { artists, loading, error };
};

/**
 * Fetch a single artist's profile with services and reviews
 */
export const useArtistProfile = (artistId: string) => {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [services, setServices] = useState<ArtistService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) {
      setLoading(false);
      return;
    }

    const fetchArtist = async () => {
      try {
        setLoading(true);

        // Fetch artist profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', artistId)
          .single();

        if (profileError) throw profileError;

        // Fetch artist services
        const { data: servicesData, error: servicesError } = await supabase
          .from('artist_services')
          .select('*')
          .eq('artist_id', artistId)
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (servicesError) throw servicesError;

        // Fetch reviews count and average
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('artist_id', artistId);

        if (reviewsError) throw reviewsError;

        const ratings = reviewsData?.map(r => r.rating) || [];
        const avgRating = ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : null;

        setArtist({
          ...profileData,
          average_rating: avgRating,
          total_reviews: ratings.length,
        });
        setServices(servicesData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch artist profile');
        console.error('Error fetching artist profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [artistId]);

  return { artist, services, loading, error };
};

/**
 * Fetch available time slots for an artist on a specific date
 */
export const useAvailableSlots = (artistId: string, date: string) => {
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId || !date) {
      setLoading(false);
      return;
    }

    const fetchSlots = async () => {
      try {
        setLoading(true);

        // Call the database function get_available_slots
        const { data, error: slotError } = await supabase
          .rpc('get_available_slots', {
            p_artist_id: artistId,
            p_date: date,
          });

        if (slotError) throw slotError;

        // Convert to BookingSlot format
        const formattedSlots = data?.map((slot: any) => ({
          time: slot.slot_time,
          available: true,
        })) || [];

        setSlots(formattedSlots);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch available slots');
        console.error('Error fetching slots:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSlots();
  }, [artistId, date]);

  return { slots, loading, error };
};

/**
 * Create a new booking using secure server-side RPC
 * IMPORTANT: Price is calculated server-side from artist_services table
 * Client-provided price is IGNORED for security
 */
export const useCreateBooking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  const createBooking = useCallback(async (
    customerId: string,
    artistId: string,
    serviceId: string,
    serviceName: string,
    totalPrice: number,
    bookingDate: string,
    bookingTime: string,
    notes?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Use secure RPC function that calculates price server-side
      // The client-provided totalPrice is only used for UI preview
      // The actual booking uses authoritative price from artist_services table
      const { data, error: createError } = await supabase
        .rpc('create_booking', {
          p_artist_id: artistId,
          p_service_id: serviceId,
          p_booking_date: bookingDate,
          p_booking_time: bookingTime,
          p_notes: notes || null,
        });

      if (createError) throw createError;
      
      if (!data || data.length === 0) {
        throw new Error('Booking creation failed. No booking returned.');
      }

      // Map RPC response to Booking interface
      const bookingData = data[0];
      const mappedBooking: Booking = {
        id: bookingData.booking_id,
        customer_id: bookingData.customer_id,
        artist_id: bookingData.artist_id,
        service_id: bookingData.service_id,
        service_name: bookingData.service_name,
        total_price: Number(bookingData.total_amount), // Server-calculated authoritative price
        booking_date: bookingData.booking_date,
        booking_time: bookingData.booking_time,
        status: bookingData.status as Booking['status'],
        payment_status: bookingData.payment_status as Booking['payment_status'],
        created_at: bookingData.created_at,
      };

      setBooking(mappedBooking);
      return mappedBooking;
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
      console.error('Error creating booking:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createBooking, booking, loading, error };
};

/**
 * Fetch user's bookings
 */
export const useMyBookings = (userId: string) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchBookings = async () => {
      try {
        setLoading(true);

        const { data, error: bookingsError } = await supabase
          .from('bookings')
          .select(`
            *,
            artist:profiles!bookings_artist_id_fkey (
              username,
              full_name,
              avatar_url,
              shop_name
            ),
            service:artist_services!bookings_service_id_fkey (
              title,
              price
            )
          `)
          .eq('customer_id', userId)
          .order('booking_date', { ascending: false, foreignTable: '' })
          .order('booking_time', { ascending: false, foreignTable: '' });

        if (bookingsError) throw bookingsError;

        setBookings(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch bookings');
        console.error('Error fetching bookings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [userId]);

  return { bookings, loading, error };
};

/**
 * Cancel a booking
 */
export const useCancelBooking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelBooking = useCallback(async (bookingId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { error: cancelError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (cancelError) throw cancelError;

      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to cancel booking');
      console.error('Error cancelling booking:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { cancelBooking, loading, error };
};

/**
 * Search artists by name or location
 */
export const useSearchArtists = (searchTerm: string) => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      setArtists([]);
      setLoading(false);
      return;
    }

    const searchArtists = async () => {
      try {
        setLoading(true);

        const { data, error: searchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('account_type', 'professional')
          .eq('industry', 'makeup_artist')
          .eq('seller_status', 'verified')
          .ilike('username', `%${searchTerm}%`);

        if (searchError) throw searchError;

        setArtists(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to search artists');
        console.error('Error searching artists:', err);
      } finally {
        setLoading(false);
      }
    };

    searchArtists();
  }, [searchTerm]);

  return { artists, loading, error };
};
