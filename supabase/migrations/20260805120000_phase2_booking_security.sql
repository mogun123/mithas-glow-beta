-- MITHAS GLOW - Phase 2: Booking Security & Financial Integrity
-- Purpose: Server-side price validation, double-booking prevention, and booking integrity
-- Date: 2026-08-05
-- 
-- This migration creates a secure create_booking RPC function that:
-- 1. Fetches authoritative service price from database (ignores client price)
-- 2. Validates service belongs to artist
-- 3. Validates customer using auth.uid()
-- 4. Prevents double-booking atomically
-- 5. Validates date/time
-- 6. Calculates all financial values server-side

-- ============================================
-- PART 1: Create secure create_booking RPC function
-- ============================================

CREATE OR REPLACE FUNCTION public.create_booking(
  p_artist_id UUID,
  p_service_id UUID,
  p_booking_date DATE,
  p_booking_time TIME,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  booking_id UUID,
  customer_id UUID,
  artist_id UUID,
  service_id UUID,
  service_name VARCHAR,
  base_price DECIMAL,
  travel_fee DECIMAL,
  platform_fee DECIMAL,
  total_amount DECIMAL,
  advance_amount DECIMAL,
  artist_amount DECIMAL,
  booking_date DATE,
  booking_time TIME,
  status VARCHAR,
  payment_status VARCHAR,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_customer_id UUID;
  v_service_record RECORD;
  v_base_price DECIMAL;
  v_travel_fee DECIMAL := 0;
  v_platform_fee_rate DECIMAL := 0.15; -- 15% platform commission (configurable)
  v_platform_fee DECIMAL;
  v_total_amount DECIMAL;
  v_advance_rate DECIMAL := 0.20; -- 20% advance payment (configurable)
  v_advance_amount DECIMAL;
  v_artist_amount DECIMAL;
  v_booking_id UUID;
  v_conflict_count INTEGER;
BEGIN
  -- ============================================
  -- STEP 1: Get authenticated customer
  -- ============================================
  v_customer_id := auth.uid();
  
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required. Please log in to create a booking.';
  END IF;
  
  -- ============================================
  -- STEP 2: Validate service exists and fetch authoritative price
  -- ============================================
  SELECT 
    asp.id,
    asp.artist_id,
    asp.title,
    asp.price,
    asp.is_active,
    asp.category
  INTO v_service_record
  FROM public.artist_services asp
  WHERE asp.id = p_service_id;
  
  -- Service must exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid service selected. Service does not exist.';
  END IF;
  
  -- Service must be active
  IF NOT v_service_record.is_active THEN
    RAISE EXCEPTION 'This service is no longer available.';
  END IF;
  
  -- ============================================
  -- STEP 3: Validate service belongs to artist
  -- ============================================
  IF v_service_record.artist_id != p_artist_id THEN
    RAISE EXCEPTION 'Service does not belong to the selected artist.';
  END IF;
  
  -- ============================================
  -- STEP 4: Validate artist exists and is active
  -- ============================================
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_artist_id 
      AND account_type = 'professional'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Selected artist is not available.';
  END IF;
  
  -- ============================================
  -- STEP 5: Validate date (not in past)
  -- ============================================
  IF p_booking_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot book appointments in the past.';
  END IF;
  
  -- ============================================
  -- STEP 6: Validate time slot availability (atomic check)
  -- ============================================
  -- Check if slot is already booked with an active booking
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.bookings
  WHERE artist_id = p_artist_id
    AND booking_date = p_booking_date
    AND booking_time = p_booking_time
    AND status NOT IN ('cancelled', 'rejected', 'no_show');
  
  IF v_conflict_count > 0 THEN
    RAISE EXCEPTION 'This time slot is no longer available. Please select another time.';
  END IF;
  
  -- ============================================
  -- STEP 7: Calculate authoritative financial values
  -- ============================================
  -- Base price from database (TRUSTED SOURCE)
  v_base_price := v_service_record.price;
  
  -- Validate price is reasonable
  IF v_base_price <= 0 THEN
    RAISE EXCEPTION 'Invalid service price. Please contact the artist.';
  END IF;
  
  IF v_base_price > 1000000 THEN
    RAISE EXCEPTION 'Service price exceeds maximum allowed amount.';
  END IF;
  
  -- Travel fee calculation (example: home service category)
  -- This can be enhanced based on actual requirements
  IF v_service_record.category = 'home_service' THEN
    v_travel_fee := 500; -- Fixed travel fee for home services
  END IF;
  
  -- Platform fee (commission)
  v_platform_fee := ROUND(v_base_price * v_platform_fee_rate);
  
  -- Total amount
  v_total_amount := v_base_price + v_travel_fee;
  
  -- Advance payment (20% of total)
  v_advance_amount := ROUND(v_total_amount * v_advance_rate);
  
  -- Artist earnings (total minus platform fee)
  v_artist_amount := v_total_amount - v_platform_fee;
  
  -- ============================================
  -- STEP 8: Create booking with authoritative values
  -- ============================================
  INSERT INTO public.bookings (
    customer_id,
    artist_id,
    service_id,
    service_name,
    total_price,
    booking_date,
    booking_time,
    status,
    payment_status,
    notes
  ) VALUES (
    v_customer_id,
    p_artist_id,
    p_service_id,
    v_service_record.title,
    v_total_amount,
    p_booking_date,
    p_booking_time,
    'pending',
    'pending',
    p_notes
  )
  RETURNING id INTO v_booking_id;
  
  -- ============================================
  -- STEP 9: Return comprehensive booking details
  -- ============================================
  RETURN QUERY
  SELECT 
    v_booking_id,
    v_customer_id,
    p_artist_id,
    p_service_id,
    v_service_record.title,
    v_base_price,
    v_travel_fee,
    v_platform_fee,
    v_total_amount,
    v_advance_amount,
    v_artist_amount,
    p_booking_date,
    p_booking_time,
    'pending'::VARCHAR,
    'pending'::VARCHAR,
    NOW();
  
EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise with clean message
    RAISE EXCEPTION 'Booking failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 2: Add partial unique index for double-booking prevention
-- ============================================
-- Only active bookings should block the same artist/date/time
-- Cancelled/rejected bookings should not permanently block slots

-- First, drop any existing conflicting indexes
DROP INDEX IF EXISTS public.idx_bookings_artist_date_time_unique;

-- Create partial unique index for active bookings only
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_artist_date_time_active
ON public.bookings (artist_id, booking_date, booking_time)
WHERE status NOT IN ('cancelled', 'rejected', 'no_show');

-- ============================================
-- PART 3: Update RLS policies for bookings table
-- ============================================
-- Ensure customers cannot manipulate financial fields or other users' data

-- Drop old policies
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and artists can view related bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and artists can update related bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;

-- Recreate policies with stricter controls
CREATE POLICY "Users can create own bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (
    auth.uid() = customer_id 
    AND artist_id IS NOT NULL
    AND service_id IS NOT NULL
  );

CREATE POLICY "Users and artists can view related bookings"
  ON public.bookings
  FOR SELECT
  USING (
    auth.uid() = customer_id 
    OR auth.uid() = artist_id
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND account_type = 'admin'
    )
  );

-- Users can only update their own notes/status requests, not financial fields
CREATE POLICY "Customers can update own booking requests"
  ON public.bookings
  FOR UPDATE
  USING (auth.uid() = customer_id)
  WITH CHECK (
    auth.uid() = customer_id
    -- Prevent customers from modifying financial fields
    AND OLD.total_price = NEW.total_price
    AND OLD.payment_status = NEW.payment_status
  );

-- Artists can update booking status but not financial amounts
CREATE POLICY "Artists can manage assigned bookings"
  ON public.bookings
  FOR UPDATE
  USING (auth.uid() = artist_id)
  WITH CHECK (
    auth.uid() = artist_id
    -- Prevent artists from modifying financial fields
    AND OLD.total_price = NEW.total_price
    AND OLD.base_price IS NOT DISTINCT FROM NEW.base_price
    AND OLD.platform_fee IS NOT DISTINCT FROM NEW.platform_fee
  );

-- Only admins can delete bookings
DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;
CREATE POLICY "Admins can delete bookings"
  ON public.bookings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND account_type = 'admin'
    )
  );

-- ============================================
-- PART 4: Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION public.create_booking TO authenticated;

-- ============================================
-- PART 5: Add check constraint for price validation
-- ============================================
-- Prevent negative or zero prices in bookings
ALTER TABLE public.bookings
ADD CONSTRAINT IF NOT EXISTS chk_bookings_total_price_positive
CHECK (total_price IS NULL OR total_price > 0);

-- ============================================
-- Summary
-- ============================================
-- This migration implements:
-- 1. Server-side price calculation from trusted artist_services table
-- 2. Service-to-artist relationship validation
-- 3. Customer authentication via auth.uid()
-- 4. Atomic double-booking prevention
-- 5. Date/time validation
-- 6. Financial field protection via RLS
-- 7. Partial unique index for active bookings only
--
-- The frontend should call create_booking() RPC instead of direct INSERT.
-- Client-provided prices are completely ignored.
