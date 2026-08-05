-- MITHAS GLOW - Bookings Schema Reconciliation Migration
-- Supersedes: 20260728_create_bookings_tables.sql and 20260729_complete_booking_flow.sql
-- Purpose: Resolve schema conflicts between the two booking migrations
-- 
-- This migration ensures:
-- 1. bookings table uses customer_id (not user_id)
-- 2. booking_date is DATE type (not TIMESTAMPTZ)
-- 3. booking_time TIME column exists
-- 4. service_name VARCHAR(255) column exists
-- 5. Explicit named foreign key constraint bookings_customer_id_fkey exists
-- 6. artist_services table has superset of columns from both migrations

-- ============================================
-- PART 1: Fix bookings table schema
-- ============================================

-- Step 1a: Rename user_id to customer_id if needed
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

-- Step 1b: Ensure booking_date is DATE type (not TIMESTAMPTZ)
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

-- Step 1c: Add booking_time TIME column if missing
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS booking_time TIME;

-- Step 1d: Add service_name VARCHAR(255) column if missing
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS service_name VARCHAR(255);

-- Step 1e: Add explicit named foreign key constraint bookings_customer_id_fkey
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

-- ============================================
-- PART 2: Reconcile artist_services table
-- Merge columns from both migrations (superset approach)
-- ============================================

-- Add availability JSONB column if missing (from 0728)
ALTER TABLE public.artist_services 
ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}'::jsonb;

-- Add rating INTEGER column if missing (from 0728)
ALTER TABLE public.artist_services 
ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0;

-- Add category VARCHAR(50) column if missing (from 0729)
ALTER TABLE public.artist_services 
ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Add is_active BOOLEAN column if missing (from 0729)
ALTER TABLE public.artist_services 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ============================================
-- PART 3: Update indexes for renamed columns
-- ============================================

-- Recreate index on customer_id if user_id index exists but customer_id doesn't
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'bookings' 
      AND indexname = 'idx_bookings_user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'bookings' 
      AND indexname = 'idx_bookings_customer_id'
  ) THEN
    CREATE INDEX idx_bookings_customer_id ON public.bookings(customer_id);
    RAISE NOTICE 'Created index idx_bookings_customer_id';
  END IF;
END $$;

-- Ensure index on booking_date exists (for DATE type queries)
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date);

-- Ensure index on booking_time exists
CREATE INDEX IF NOT EXISTS idx_bookings_booking_time ON public.bookings(booking_time);

-- Ensure composite index on artist_id, booking_date, booking_time exists
CREATE INDEX IF NOT EXISTS idx_bookings_artist_date_time ON public.bookings(artist_id, booking_date, booking_time);

-- ============================================
-- PART 4: Update RLS policies for customer_id
-- ============================================

-- Update policies that reference user_id to use customer_id
DO $$
BEGIN
  -- Drop old policy if exists
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

-- ============================================
-- Summary
-- ============================================
-- This migration reconciles schema differences between:
-- - 20260728_create_bookings_tables.sql (user_id, TIMESTAMPTZ booking_date, no booking_time/service_name)
-- - 20260729_complete_booking_flow.sql (customer_id, DATE booking_date, has booking_time/service_name)
--
-- Final schema matches what the application expects:
-- - bookings.customer_id (UUID, FK to profiles.id via bookings_customer_id_fkey)
-- - bookings.booking_date (DATE)
-- - bookings.booking_time (TIME)
-- - bookings.service_name (VARCHAR(255))
-- - artist_services with superset of columns (availability, rating, category, is_active)
