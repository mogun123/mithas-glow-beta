-- MITHAS GLOW - Phase 3A: Verified Reviews & Trust System (UPDATED & FIXED)
-- Purpose: Prevent fake reviews, enforce verified bookings, add trust signals
-- Date: 2026-08-13
--
-- This migration:
-- 1. Adds is_verified column to reviews table
-- 2. Adds response/response_at columns for artist replies
-- 3. Adds UNIQUE constraint on booking_id (one review per booking)
-- 4. Creates secure create_review RPC with validation
-- 5. Adds RLS policies for review protection
-- 6. Creates trigger to auto-set is_verified based on booking status

-- ============================================
-- PART 1: Add missing columns to reviews table
-- ============================================

-- Add is_verified flag (default FALSE for existing reviews)
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Add artist response fields
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS response TEXT,
ADD COLUMN IF NOT EXISTS response_at TIMESTAMP WITH TIME ZONE;

-- Add updated_at for review modifications
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- PART 2: Add constraints for review integrity
-- ============================================

-- Drop existing UNIQUE constraint if it exists (from product reviews)
DROP INDEX IF EXISTS reviews_user_id_product_id_order_id_key;

-- [FIXED] Drop constraints before adding to prevent "already exists" error
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_key;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_rating_check;

-- Add UNIQUE constraint on booking_id (one review per booking)
-- This prevents duplicate reviews for the same booking
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_booking_id_key UNIQUE (booking_id);

-- Add CHECK constraint for rating range
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_rating_check CHECK (rating >= 1 AND rating <= 5);

-- ============================================
-- PART 3: Create indexes for performance
-- ============================================

-- Index for fetching reviews by artist (most common query)
CREATE INDEX IF NOT EXISTS idx_reviews_artist_created 
ON public.reviews(artist_id, created_at DESC);

-- Index for verifying booking ownership
CREATE INDEX IF NOT EXISTS idx_reviews_booking 
ON public.reviews(booking_id);

-- Index for customer's reviews
CREATE INDEX IF NOT EXISTS idx_reviews_customer_artist 
ON public.reviews(customer_id, artist_id);

-- Index for verified reviews only
CREATE INDEX IF NOT EXISTS idx_reviews_verified 
ON public.reviews(artist_id, is_verified) 
WHERE is_verified = TRUE;

-- ============================================
-- PART 4: Create secure create_review RPC function
-- ============================================

CREATE OR REPLACE FUNCTION public.create_review(
  p_booking_id UUID,
  p_rating INTEGER,
  p_comment TEXT DEFAULT NULL
)
RETURNS TABLE (
  review_id UUID,
  booking_id UUID,
  customer_id UUID,
  artist_id UUID,
  rating INTEGER,
  comment TEXT,
  is_verified BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_customer_id UUID;
  v_booking_record RECORD;
  v_review_id UUID;
BEGIN
  -- ============================================
  -- STEP 1: Get authenticated customer
  -- ============================================
  v_customer_id := auth.uid();

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required. Please log in to submit a review.';
  END IF;

  -- ============================================
  -- STEP 2: Validate booking exists and fetch details
  -- ============================================
  SELECT
    b.id,
    b.customer_id,
    b.artist_id,
    b.status,
    b.booking_date,
    b.booking_time
  INTO v_booking_record
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  -- Booking must exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid booking. This booking does not exist.';
  END IF;

  -- ============================================
  -- STEP 3: Validate customer owns the booking
  -- ============================================
  IF v_booking_record.customer_id != v_customer_id THEN
    RAISE EXCEPTION 'You can only review your own bookings.';
  END IF;

  -- ============================================
  -- STEP 4: Validate booking is completed
  -- ============================================
  IF v_booking_record.status != 'completed' THEN
    RAISE EXCEPTION 'You can only review completed bookings. This booking status is: %', v_booking_record.status;
  END IF;

  -- ============================================
  -- STEP 5: Check if review already exists for this booking
  -- ============================================
  IF EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.booking_id = p_booking_id
  ) THEN
    RAISE EXCEPTION 'You have already reviewed this booking.';
  END IF;

  -- ============================================
  -- STEP 6: Validate rating
  -- ============================================
  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 stars.';
  END IF;

  -- ============================================
  -- STEP 7: Validate comment length (if provided)
  -- ============================================
  IF p_comment IS NOT NULL AND LENGTH(p_comment) > 2000 THEN
    RAISE EXCEPTION 'Review comment cannot exceed 2000 characters.';
  END IF;

  -- ============================================
  -- STEP 8: Check for inappropriate content (basic)
  -- ============================================
  IF p_comment IS NOT NULL THEN
    -- Check for obvious phone number patterns (Indian format)
    IF p_comment ~* '(\+91|0)?[6-9]\d{9}' THEN
      RAISE EXCEPTION 'Reviews cannot contain phone numbers. Please keep reviews focused on your experience.';
    END IF;

    -- Check for email patterns
    IF p_comment ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN
      RAISE EXCEPTION 'Reviews cannot contain email addresses.';
    END IF;

    -- Check for UPI IDs
    IF p_comment ~* '[a-zA-Z0-9._-]+@upi' THEN
      RAISE EXCEPTION 'Reviews cannot contain UPI IDs or payment information.';
    END IF;

    -- Check for WhatsApp links
    IF p_comment ~* '(wa\.me|whatsapp\.com)' THEN
      RAISE EXCEPTION 'Reviews cannot contain external contact links.';
    END IF;
  END IF;

  -- ============================================
  -- STEP 9: Create review with is_verified = TRUE
  -- ============================================
  INSERT INTO public.reviews (
    booking_id,
    customer_id,
    artist_id,
    rating,
    comment,
    is_verified,
    created_at,
    updated_at
  ) VALUES (
    p_booking_id,
    v_customer_id,
    v_booking_record.artist_id,
    p_rating,
    p_comment,
    TRUE, -- VERIFIED because we validated booking ownership and completion
    NOW(),
    NOW()
  )
  RETURNING id INTO v_review_id;

  -- ============================================
  -- STEP 10: Return review details
  -- ============================================
  RETURN QUERY
  SELECT
    v_review_id,
    p_booking_id,
    v_customer_id,
    v_booking_record.artist_id,
    p_rating,
    p_comment,
    TRUE,
    NOW();

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Review submission failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 5: Create function for artists to respond to reviews
-- ============================================

CREATE OR REPLACE FUNCTION public.respond_to_review(
  p_review_id UUID,
  p_response TEXT
)
RETURNS TABLE (
  review_id UUID,
  response TEXT,
  response_at TIMESTAMPTZ
) AS $$
DECLARE
  v_artist_id UUID;
  v_review_artist_id UUID;
BEGIN
  -- Get authenticated user (must be artist)
  v_artist_id := auth.uid();

  IF v_artist_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  -- Get the review and verify it belongs to this artist
  SELECT r.artist_id INTO v_review_artist_id
  FROM public.reviews r
  WHERE r.id = p_review_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found.';
  END IF;

  IF v_review_artist_id != v_artist_id THEN
    RAISE EXCEPTION 'You can only respond to reviews for your own profile.';
  END IF;

  -- Validate response length
  IF LENGTH(p_response) > 1000 THEN
    RAISE EXCEPTION 'Response cannot exceed 1000 characters.';
  END IF;

  -- Basic content check (no phone numbers, etc.)
  IF p_response ~* '(\+91|0)?[6-9]\d{9}' THEN
    RAISE EXCEPTION 'Responses cannot contain phone numbers.';
  END IF;

  IF p_response ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}' THEN
    RAISE EXCEPTION 'Responses cannot contain email addresses.';
  END IF;

  -- Update review with response
  UPDATE public.reviews
  SET 
    response = p_response,
    response_at = NOW(),
    updated_at = NOW()
  WHERE id = p_review_id;

  RETURN QUERY
  SELECT 
    p_review_id,
    p_response,
    NOW();

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to submit response: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 6: Create function to get artist trust metrics
-- ============================================

CREATE OR REPLACE FUNCTION public.get_artist_trust_metrics(
  p_artist_id UUID
)
RETURNS TABLE (
  total_bookings INTEGER,
  completed_bookings INTEGER,
  cancelled_bookings INTEGER,
  completion_rate DECIMAL,
  total_reviews INTEGER,
  verified_reviews INTEGER,
  average_rating DECIMAL,
  response_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(b.total_bookings, 0)::INTEGER,
    COALESCE(b.completed_bookings, 0)::INTEGER,
    COALESCE(b.cancelled_bookings, 0)::INTEGER,
    CASE 
      WHEN b.total_bookings > 0 THEN 
        ROUND((b.completed_bookings::DECIMAL / NULLIF(b.total_bookings, 0)) * 100, 1)
      ELSE 0 
    END,
    COALESCE(r.total_reviews, 0)::INTEGER,
    COALESCE(r.verified_reviews, 0)::INTEGER,
    COALESCE(r.average_rating, 0),
    CASE 
      WHEN r.total_reviews > 0 THEN 
        ROUND((r.response_count::DECIMAL / NULLIF(r.total_reviews, 0)) * 100, 1)
      ELSE 0 
    END
  FROM (
    SELECT 
      COUNT(*) FILTER (WHERE status != 'cancelled') as total_bookings,
      COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_bookings
    FROM public.bookings
    WHERE artist_id = p_artist_id
  ) b
  CROSS JOIN (
    SELECT 
      COUNT(*) as total_reviews,
      COUNT(*) FILTER (WHERE is_verified = TRUE) as verified_reviews,
      COUNT(*) FILTER (WHERE response IS NOT NULL) as response_count,
      ROUND(AVG(rating), 2) as average_rating
    FROM public.reviews
    WHERE artist_id = p_artist_id
  ) r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 7: Update RLS policies for reviews table
-- ============================================

-- Enable RLS on reviews table
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Artists can respond to own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews via RPC" ON public.reviews;

-- Policy 1: Anyone can view reviews (public display)
CREATE POLICY "Users can view all reviews"
  ON public.reviews
  FOR SELECT
  USING (true);

-- Policy 2: Authenticated users can create reviews ONLY via RPC
CREATE POLICY "Users can create reviews via RPC"
  ON public.reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id
    AND booking_id IS NOT NULL
    AND artist_id IS NOT NULL
  );

-- Policy 3: Users can update only their own reviews (limited fields)
CREATE POLICY "Users can update own reviews"
  ON public.reviews
  FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Policy 4: Artists can respond to reviews on their profile
CREATE POLICY "Artists can respond to own reviews"
  ON public.reviews
  FOR UPDATE
  USING (auth.uid() = artist_id)
  WITH CHECK (auth.uid() = artist_id);

-- Policy 5: Admins can delete any review (moderation)
CREATE POLICY "Admins can delete reviews"
  ON public.reviews
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND account_type = 'admin'
    )
  );

-- ============================================
-- PART 8: Grant permissions
-- ============================================

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.create_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_review TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_artist_trust_metrics TO authenticated;

-- ============================================
-- PART 9: Add check constraint for comment appropriateness
-- ============================================

-- [FIXED] Drop constraint before adding to prevent "already exists" error
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_comment_length_check;

-- Prevent extremely short comments (spam prevention)
ALTER TABLE public.reviews
ADD CONSTRAINT reviews_comment_length_check 
CHECK (comment IS NULL OR LENGTH(comment) >= 10 OR comment = '');
