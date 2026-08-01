-- MITHAS GLOW BETA: Complete Booking Schema
-- Ensures robust user-side booking flow with real-time availability and events integration

-- 1. Ensure Profiles has necessary fields for Artists
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'personal',
ADD COLUMN IF NOT EXISTS industry VARCHAR(50),
ADD COLUMN IF NOT EXISTS seller_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS shop_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS experience VARCHAR(50),
ADD COLUMN IF NOT EXISTS operating_hours JSONB, -- { "monday": {"start": "09:00", "end": "18:00"} }
ADD COLUMN IF NOT EXISTS portfolio_link TEXT,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(9,6),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(9,6);

-- 2. Artist Services Table (What they offer)
CREATE TABLE IF NOT EXISTS artist_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL, -- e.g., "Bridal Makeup", "Party Glam"
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  category VARCHAR(50), -- 'bridal', 'party', 'home_service'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES artist_services(id),
  service_name VARCHAR(255), -- Denormalized for quick display
  total_price DECIMAL(10, 2),
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, completed, cancelled, no_show
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
  payment_id VARCHAR(255), -- Razorpay Payment ID
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  artist_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50), -- 'booking_confirmed', 'reminder', 'promotion'
  is_read BOOLEAN DEFAULT FALSE,
  related_booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES for Performance
CREATE INDEX IF NOT EXISTS idx_profiles_artist_filter ON profiles(account_type, industry, seller_status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_artist_date ON bookings(artist_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_services_artist ON artist_services(artist_id, is_active);

-- 6. FUNCTION: Get Available Slots for an Artist on a Specific Date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_artist_id UUID,
  p_date DATE
)
RETURNS TABLE(slot_time TIME) AS $$
DECLARE
  v_operating_hours JSONB;
  v_start_time TIME;
  v_end_time TIME;
  v_interval INTERVAL := '1 hour'::INTERVAL;
  v_current_time TIME;
BEGIN
  -- Get artist's operating hours (Default 9 AM to 6 PM if not set)
  SELECT COALESCE(operating_hours->to_char(p_date, 'day'), '{"start": "09:00", "end": "18:00"}'::jsonb)
  INTO v_operating_hours
  FROM profiles WHERE id = p_artist_id;

  v_start_time := (v_operating_hours->>'start')::TIME;
  v_end_time := (v_operating_hours->>'end')::TIME;
  v_current_time := v_start_time;

  -- Generate slots
  WHILE v_current_time < v_end_time LOOP
    -- Check if slot is already booked
    IF NOT EXISTS (
      SELECT 1 FROM bookings
      WHERE artist_id = p_artist_id
        AND booking_date = p_date
        AND booking_time = v_current_time
        AND status NOT IN ('cancelled', 'no_show')
    ) THEN
      slot_time := v_current_time;
      RETURN NEXT;
    END IF;
    v_current_time := v_current_time + v_interval;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGER: Auto-create Event on Booking Confirmation
CREATE OR REPLACE FUNCTION create_booking_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmed' THEN
    INSERT INTO events (user_id, title, description, event_date, event_time, type, is_completed)
    VALUES (
      NEW.customer_id,
      'Makeup Appointment: ' || COALESCE(NEW.service_name, 'Service'),
      'Appointment with artist at ' || NEW.booking_time::text,
      NEW.booking_date,
      NEW.booking_time,
      'appointment',
      FALSE
    );
    
    -- Create Notification for Customer
    INSERT INTO notifications (user_id, title, message, type, related_booking_id)
    VALUES (
      NEW.customer_id,
      'Booking Confirmed! 💄',
      'Your appointment for ' || COALESCE(NEW.service_name, 'Service') || ' is confirmed for ' || NEW.booking_date::text || ' at ' || NEW.booking_time::text,
      'booking_confirmed',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_event ON bookings;
CREATE TRIGGER trg_booking_event
AFTER UPDATE OF status ON bookings
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION create_booking_event();
