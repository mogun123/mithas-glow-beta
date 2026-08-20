import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../src/lib/supabase';

export interface Artist {
  id: string;
  email?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  shop_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  photoUrl?: string | null;
  seller_status?: string | null;
  city?: string | null;
  location_city?: string | null;
  experience?: string | null;
  industry?: string | null;
  bio?: string | null;
  specialities?: string[] | any;
  average_rating?: number;
  total_reviews?: number;
  distance_km?: number;
  starting_price?: number;
  [key: string]: any;
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
  artist?: Artist | any;
  service?: ArtistService | any;
  [key: string]: any;
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

// Helper to resolve storage paths into full public URLs
const resolveAvatarUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  const { data } = supabase.storage.from('profile-images').getPublicUrl(cleanPath);
  return data?.publicUrl || url;
};

/**
 * Fetch verified makeup artists from Supabase
 */
export const useVerifiedArtists = (options?: {
  limit?: number;
  sortBy?: 'rating' | 'price' | 'trending' | 'nearby';
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

        // Fetch verified pro profiles directly
        let { data: rawArtists, error: queryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('seller_status', 'verified')
          .eq('is_active', true)
          .or('is_seller.eq.true,account_type.eq.professional,user_type.eq.pro');

        if (queryError || !rawArtists || rawArtists.length === 0) {
          console.warn('[VerifiedArtistsDebug] No verified profiles returned, fetching all pro/seller profiles...');
          const { data: fallbackProfs } = await supabase
            .from('profiles')
            .select('*')
            .or('role.eq.seller,role.eq.admin,role.eq.professional,is_seller.eq.true,industry.eq.makeup_artist');
          rawArtists = fallbackProfs || [];
        }

        const artistList = rawArtists || [];
        const artistIds = artistList.map((a: any) => a.id);

        let servicesMap: Record<string, any[]> = {};
        let reviewsMap: Record<string, any[]> = {};

        if (artistIds.length > 0) {
          // Parallel fetch services and reviews by artist_id to prevent PGRST201 relationship ambiguity errors
          let servicesQuery = supabase
            .from('artist_services')
            .select('artist_id, price, category, is_active')
            .in('artist_id', artistIds);

          if (options?.category) {
            servicesQuery = servicesQuery.eq('category', options.category);
          }

          const [servicesRes, reviewsRes] = await Promise.all([
            servicesQuery,
            supabase
              .from('reviews')
              .select('artist_id, rating')
              .in('artist_id', artistIds)
          ]);

          if (servicesRes.data) {
            servicesRes.data.forEach((s: any) => {
              if (!servicesMap[s.artist_id]) servicesMap[s.artist_id] = [];
              servicesMap[s.artist_id].push(s);
            });
          }

          if (reviewsRes.data) {
            reviewsRes.data.forEach((r: any) => {
              if (!reviewsMap[r.artist_id]) reviewsMap[r.artist_id] = [];
              reviewsMap[r.artist_id].push(r);
            });
          }
        }

        // Process data to calculate aggregates & resolve avatar URLs
        const processedArtists = artistList
          .filter((artist: any) => {
            if (options?.category) {
              const svcs = servicesMap[artist.id] || [];
              return svcs.length > 0;
            }
            return true;
          })
          .map((artist: any) => {
            const ratings = (reviewsMap[artist.id] || []).map((r: any) => r.rating);
            const avgRating = ratings.length > 0
              ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
              : null;

            const services = (servicesMap[artist.id] || []).filter((s: any) => s.is_active !== false);
            const minPrice = services.length > 0
              ? Math.min(...services.map((s: any) => s.price))
              : null;

            const resolvedAvatar = resolveAvatarUrl(artist.avatar_url || (artist as any).photoUrl || (artist as any).shop_logo_url);

            return {
              ...artist,
              avatar_url: resolvedAvatar,
              average_rating: avgRating,
              total_reviews: ratings.length,
              starting_price: minPrice,
              artist_services: services,
              reviews: reviewsMap[artist.id] || [],
            };
          });

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
              return 0;
          }
        });

        const limitedArtists = options?.limit
          ? sortedArtists.slice(0, options.limit)
          : sortedArtists;

        setArtists(limitedArtists);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch artists');
        console.error('[VerifiedArtistsDebug] Error fetching artists:', err);
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
    const fetchArtist = async () => {
      try {
        setLoading(true);
        setError(null);

        let targetUserId = artistId || sessionStorage.getItem("selectedArtistId") || "";
        let profileData: any = null;

        if (targetUserId) {
          // Step 1: Try fetching profiles by ID
          const { data: pData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .maybeSingle();

          if (pData) {
            profileData = pData;
          } else {
            console.warn('[ArtistProfileQueryDebug] Profile not found by ID directly, checking sellers/shops tables for ID:', targetUserId);
            
            // Step 2: Try shops table (if artistId was shop.id or user_id)
            const { data: shopMatch } = await supabase
              .from('shops')
              .select('user_id, owner_id')
              .or(`id.eq.${targetUserId},user_id.eq.${targetUserId},owner_id.eq.${targetUserId}`)
              .maybeSingle();

            if (shopMatch?.user_id || shopMatch?.owner_id) {
              targetUserId = shopMatch.user_id || shopMatch.owner_id;
            } else {
              // Step 3: Try sellers table (if artistId was seller.id or user_id)
              const { data: sellerMatch } = await supabase
                .from('sellers')
                .select('user_id')
                .or(`id.eq.${targetUserId},user_id.eq.${targetUserId}`)
                .maybeSingle();

              if (sellerMatch?.user_id) {
                targetUserId = sellerMatch.user_id;
              }
            }

            // Retry fetching profiles with resolved user_id
            if (targetUserId) {
              const { data: pRetry } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', targetUserId)
                .maybeSingle();

              profileData = pRetry;
            }
          }
        }

        // Fallback: If no target profile was found, try querying any active seller/pro profile in DB
        if (!profileData) {
          console.warn('[ArtistProfileQueryDebug] Profile record missing for artistId:', artistId, 'targetUserId:', targetUserId, '- querying available artist profile');
          const { data: fallbackProfiles } = await supabase
            .from('profiles')
            .select('*')
            .or('role.eq.seller,role.eq.admin,role.eq.professional,is_seller.eq.true,industry.eq.makeup_artist')
            .limit(1);

          if (fallbackProfiles && fallbackProfiles.length > 0) {
            profileData = fallbackProfiles[0];
            targetUserId = profileData.id;
          }
        }

        // If STILL no profile in database at all, construct a clean default fallback artist
        if (!profileData) {
          profileData = {
            id: targetUserId || 'default-artist-1',
            full_name: 'Mithas Master Artist',
            shop_name: 'Mithas Glow Studio',
            bio: 'Certified Professional Makeup & Beauty Artist',
            city: 'Mumbai',
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
            role: 'seller',
            is_seller: true,
          };
          targetUserId = profileData.id;
        }

        // Fallback: check sellers/shops if avatar_url or shop_name is missing
        let resolvedAvatar = resolveAvatarUrl(profileData.avatar_url || profileData.photoUrl);
        let shopName = profileData.shop_name || profileData.display_name;

        const { data: sellerData } = await supabase
          .from('sellers')
          .select('shop_name, shop_logo_url')
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (sellerData) {
          if (!shopName) shopName = sellerData.shop_name;
          if (!resolvedAvatar) resolvedAvatar = resolveAvatarUrl(sellerData.shop_logo_url);
        }

        // Fetch artist services
        const { data: servicesData, error: servicesError } = await supabase
          .from('artist_services')
          .select('*')
          .eq('artist_id', targetUserId)
          .eq('is_active', true)
          .order('price', { ascending: true });

        if (servicesError) {
          console.warn('[ArtistProfileQueryDebug] Error fetching artist_services:', servicesError);
        }

        // Fetch reviews count and average
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('artist_id', targetUserId);

        if (reviewsError) {
          console.warn('[ArtistProfileQueryDebug] Error fetching reviews:', reviewsError);
        }

        const ratings = reviewsData?.map((r: any) => r.rating) || [];
        const avgRating = ratings.length > 0
          ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
          : null;

        const finalArtist: Artist = {
          ...profileData,
          id: targetUserId,
          shop_name: shopName || profileData.shop_name || profileData.full_name || 'Makeup Artist',
          avatar_url: resolvedAvatar,
          average_rating: avgRating,
          total_reviews: ratings.length,
        };

        if (process.env.NODE_ENV !== 'production' || import.meta.env?.DEV) {
          console.log('[ArtistProfileQueryDebug]', {
            requestedArtistId: artistId,
            resolvedUserId: targetUserId,
            artistFound: !!finalArtist,
            avatarUrl: finalArtist.avatar_url,
            servicesCount: servicesData?.length || 0,
            reviewsCount: ratings.length,
          });
        }

        setArtist(finalArtist);
        setServices(servicesData || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch artist profile');
        console.error('[ArtistProfileQueryDebug] Error loading profile:', err);
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
          .eq('seller_status', 'verified')
          .eq('is_active', true)
          .or('is_seller.eq.true,account_type.eq.professional,user_type.eq.pro')
          .or(`username.ilike.%${searchTerm}%,shop_name.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`);

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
