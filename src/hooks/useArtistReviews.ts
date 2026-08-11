import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ArtistReview {
  id: string;
  booking_id: string;
  customer_id: string;
  artist_id: string;
  rating: number;
  comment: string | null;
  response: string | null;
  response_at: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  customer_name?: string;
  customer_avatar_url?: string;
}

export interface ReviewSummary {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

/**
 * Fetch reviews for a specific artist with customer profile information
 * Read-only hook that safely joins reviews with profiles data
 */
export const useArtistReviews = (artistId: string, limit: number = 10) => {
  const [reviews, setReviews] = useState<ArtistReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!artistId) {
      setLoading(false);
      return;
    }

    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch reviews with customer profile information
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('reviews')
          .select(`
            *,
            customer:profiles!reviews_customer_id_fkey (
              full_name,
              display_name,
              avatar_url
            )
          `)
          .eq('artist_id', artistId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (reviewsError) throw reviewsError;

        // Transform data to include customer information
        const transformedReviews: ArtistReview[] = reviewsData?.map((review: any) => ({
          ...review,
          customer_name: review.customer?.display_name || review.customer?.full_name || 'Anonymous',
          customer_avatar_url: review.customer?.avatar_url,
        })) || [];

        setReviews(transformedReviews);

        // Calculate review summary from fetched reviews
        if (transformedReviews.length > 0) {
          const ratings = transformedReviews.map(r => r.rating);
          const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
          
          const distribution = {
            5: transformedReviews.filter(r => r.rating === 5).length,
            4: transformedReviews.filter(r => r.rating === 4).length,
            3: transformedReviews.filter(r => r.rating === 3).length,
            2: transformedReviews.filter(r => r.rating === 2).length,
            1: transformedReviews.filter(r => r.rating === 1).length,
          };

          setSummary({
            average_rating: avgRating,
            total_reviews: transformedReviews.length,
            rating_distribution: distribution,
          });
        } else {
          setSummary({
            average_rating: 0,
            total_reviews: 0,
            rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
          });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch reviews');
        console.error('Error fetching artist reviews:', err);
        setReviews([]);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [artistId, limit]);

  return { reviews, summary, loading, error };
};
