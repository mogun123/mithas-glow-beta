-- QUICK FIX FOR BOOKING_TIME COLUMN ERROR
-- Run this in your Supabase SQL Editor to fix the "column bookings.booking_time does not exist" error

-- =====================================================
-- STEP 1: Add booking_time column if missing
-- =====================================================
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS booking_time TIME;

-- =====================================================
-- STEP 2: Add service_name column if missing
-- =====================================================
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS service_name VARCHAR(255);

-- =====================================================
-- STEP 3: Convert booking_date to DATE type if it's TIMESTAMPTZ
-- =====================================================
DO $$
DECLARE
  v_col_type text;
BEGIN
  SELECT data_type INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'bookings'
    AND column_name = 'booking_date';

  IF v_col_type = 'timestamp with time zone' OR v_col_type = 'timestamp without time zone' THEN
    -- Add temporary column
    ALTER TABLE public.bookings ADD COLUMN booking_date_new DATE;
    -- Backfill from old column
    UPDATE public.bookings SET booking_date_new = booking_date::DATE;
    -- Drop old column
    ALTER TABLE public.bookings DROP COLUMN booking_date;
    -- Rename new column
    ALTER TABLE public.bookings RENAME COLUMN booking_date_new TO booking_date;
    RAISE NOTICE 'Converted bookings.booking_date from TIMESTAMPTZ to DATE';
  END IF;
END $$;

-- =====================================================
-- STEP 4: Rename user_id to customer_id if needed
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bookings'
      AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.bookings RENAME COLUMN user_id TO customer_id;
    RAISE NOTICE 'Renamed bookings.user_id to customer_id';
  END IF;
END $$;

-- =====================================================
-- STEP 5: Add foreign key constraint if missing
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_customer_id_fkey'
      AND conrelid = 'public.bookings'::regclass
  ) THEN
    ALTER TABLE public.bookings
    ADD CONSTRAINT bookings_customer_id_fkey
    FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added named foreign key constraint bookings_customer_id_fkey';
  END IF;
END $$;

-- =====================================================
-- STEP 6: Create necessary indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_bookings_booking_time ON public.bookings(booking_time);
CREATE INDEX IF NOT EXISTS idx_bookings_artist_date_time ON public.bookings(artist_id, booking_date, booking_time);

-- =====================================================
-- STEP 7: Update RLS policies for customer_id
-- =====================================================
DO $$
BEGIN
  -- Drop old policies if they exist
  DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
  DROP POLICY IF EXISTS "Users and artists can view related bookings" ON public.bookings;
  DROP POLICY IF EXISTS "Users and artists can update related bookings" ON public.bookings;
  DROP POLICY IF EXISTS "Users can delete own bookings" ON public.bookings;

  -- Recreate policies with customer_id
  CREATE POLICY "Users can create own bookings"
    ON public.bookings
    FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

  CREATE POLICY "Users and artists can view related bookings"
    ON public.bookings
    FOR SELECT
    USING (auth.uid() = customer_id OR auth.uid() = artist_id);

  CREATE POLICY "Users and artists can update related bookings"
    ON public.bookings
    FOR UPDATE
    USING (auth.uid() = customer_id OR auth.uid() = artist_id)
    WITH CHECK (auth.uid() = customer_id OR auth.uid() = artist_id);

  CREATE POLICY "Users can delete own bookings"
    ON public.bookings
    FOR DELETE
    USING (auth.uid() = customer_id);

  RAISE NOTICE 'Updated RLS policies to use customer_id';
END $$;

-- =====================================================
-- VERIFICATION: Check final schema
-- =====================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bookings'
ORDER BY ordinal_position;
