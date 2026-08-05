-- MITHAS GLOW - Artist Booking Tables
-- Mirrors app/models/booking.py column structure.
-- In Supabase, application users are stored in public.profiles(id),
-- so user_id and artist_id map there instead of a local users table.
--
-- NOTE: This migration is SUPERSEDED by 20260805051114_fix_bookings_schema.sql
-- which reconciles schema conflicts with 20260729_complete_booking_flow.sql.
-- The newer migration handles: renaming user_id→customer_id, converting booking_date
-- from TIMESTAMPTZ to DATE, adding booking_time/service_name columns, and creating
-- the explicit bookings_customer_id_fkey foreign key constraint.
-- This file is preserved for migration history but should not be relied upon alone.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.artist_services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  price DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER,
  availability JSONB DEFAULT '{}'::jsonb,
  rating INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.artist_services(id) ON DELETE SET NULL,
  booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  total_price DECIMAL(10, 2),
  payment_status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artist_services_artist_id
  ON public.artist_services(artist_id);

CREATE INDEX IF NOT EXISTS idx_artist_services_created_at
  ON public.artist_services(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_artist_services_availability_gin
  ON public.artist_services USING GIN (availability);

CREATE INDEX IF NOT EXISTS idx_bookings_user_id
  ON public.bookings(user_id);

CREATE INDEX IF NOT EXISTS idx_bookings_artist_id
  ON public.bookings(artist_id);

CREATE INDEX IF NOT EXISTS idx_bookings_service_id
  ON public.bookings(service_id);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_date
  ON public.bookings(booking_date);

CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON public.bookings(status);

CREATE INDEX IF NOT EXISTS idx_bookings_payment_status
  ON public.bookings(payment_status);

CREATE INDEX IF NOT EXISTS idx_bookings_artist_booking_date
  ON public.bookings(artist_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_bookings_user_booking_date
  ON public.bookings(user_id, booking_date);

CREATE INDEX IF NOT EXISTS idx_bookings_timeslot_gist
  ON public.bookings
  USING GIST (
    tstzrange(
      booking_date,
      booking_date + (COALESCE(duration_minutes, 60) * INTERVAL '1 minute'),
      '[)'
    )
  );

ALTER TABLE public.artist_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artist services are publicly viewable"
  ON public.artist_services
  FOR SELECT
  USING (true);

CREATE POLICY "Artists can create own services"
  ON public.artist_services
  FOR INSERT
  WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artists can update own services"
  ON public.artist_services
  FOR UPDATE
  USING (auth.uid() = artist_id)
  WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artists can delete own services"
  ON public.artist_services
  FOR DELETE
  USING (auth.uid() = artist_id);

CREATE POLICY "Users can create own bookings"
  ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and artists can view related bookings"
  ON public.bookings
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = artist_id);

CREATE POLICY "Users and artists can update related bookings"
  ON public.bookings
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = artist_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = artist_id);

CREATE POLICY "Users can delete own bookings"
  ON public.bookings
  FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON public.artist_services TO authenticated;
GRANT ALL ON public.bookings TO authenticated;
