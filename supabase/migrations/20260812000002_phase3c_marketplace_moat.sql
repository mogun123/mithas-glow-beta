-- ============================================================
-- PHASE 3C: MARKETPLACE MOAT & ANTI-BYPASS SYSTEM (FIXED)
-- ============================================================
-- Purpose: Advanced revenue protection, trust scoring, 
-- rebooking system, and progressive enforcement.
-- ============================================================

-- 1. USER RISK PROFILES TABLE
-- Tracks cumulative risk behavior for progressive enforcement
CREATE TABLE IF NOT EXISTS user_risk_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  violation_count INTEGER NOT NULL DEFAULT 0,
  last_violation_at TIMESTAMPTZ,
  enforcement_level TEXT NOT NULL DEFAULT 'none' CHECK (enforcement_level IN ('none', 'warning', 'blocked', 'restricted', 'review', 'suspended')),
  violation_categories TEXT[] DEFAULT '{}',
  cooldown_until TIMESTAMPTZ,
  reviewed_by_admin BOOLEAN NOT NULL DEFAULT false,
  admin_notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PORTFOLIO MODERATION TABLE
-- Tracks moderation status of artist portfolio images
CREATE TABLE IF NOT EXISTS portfolio_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_item_id UUID NOT NULL, -- References artist_portfolio.id
  artist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  moderation_status TEXT NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'rejected')),
  risk_level TEXT DEFAULT 'none' CHECK (risk_level IN ('none', 'low', 'medium', 'high', 'critical')),
  detected_issues TEXT[] DEFAULT '{}',
  qr_detected BOOLEAN NOT NULL DEFAULT false,
  contact_info_detected BOOLEAN NOT NULL DEFAULT false,
  moderator_id UUID REFERENCES profiles(id),
  moderated_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. REBOOKING REQUESTS TABLE
-- Enables platform-native repeat booking flow
CREATE TABLE IF NOT EXISTS rebooking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES artist_services(id) ON DELETE SET NULL,
  requested_date DATE,
  requested_time TIME,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
  new_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_message TEXT,
  artist_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- 4. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_risk_profiles_score ON user_risk_profiles(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_enforcement ON user_risk_profiles(enforcement_level, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_risk_profiles_violations ON user_risk_profiles(violation_count DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_moderation_artist ON portfolio_moderation(artist_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_moderation_status ON portfolio_moderation(moderation_status, created_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_moderation_risk ON portfolio_moderation(risk_level DESC);

CREATE INDEX IF NOT EXISTS idx_rebooking_customer ON rebooking_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_rebooking_artist ON rebooking_requests(artist_id);
CREATE INDEX IF NOT EXISTS idx_rebooking_status ON rebooking_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_rebooking_original ON rebooking_requests(original_booking_id);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE user_risk_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE rebooking_requests ENABLE ROW LEVEL SECURITY;

-- Drop old policies to prevent "already exists" errors
DROP POLICY IF EXISTS "Users view own risk profile" ON user_risk_profiles;
DROP POLICY IF EXISTS "System insert risk profiles" ON user_risk_profiles;
DROP POLICY IF EXISTS "System update risk profiles" ON user_risk_profiles;
DROP POLICY IF EXISTS "Admins manage risk profiles" ON user_risk_profiles;

-- Risk Profiles: Users can view their own; admins can view/manage all
CREATE POLICY "Users view own risk profile" ON user_risk_profiles
  FOR SELECT USING (user_id = auth.uid());

-- [FIXED] Changed name to "System insert risk profiles" to avoid collision
CREATE POLICY "System insert risk profiles" ON user_risk_profiles
  FOR INSERT WITH CHECK (true); -- Handled by RPC

CREATE POLICY "System update risk profiles" ON user_risk_profiles
  FOR UPDATE USING (true); -- Handled by RPC

CREATE POLICY "Admins manage risk profiles" ON user_risk_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND account_type = 'admin' -- [FIXED] Changed role to account_type
    )
  );

-- Drop old policies for portfolio_moderation
DROP POLICY IF EXISTS "Artists view own portfolio moderation" ON portfolio_moderation;
DROP POLICY IF EXISTS "System insert portfolio moderation" ON portfolio_moderation;
DROP POLICY IF EXISTS "Moderators update portfolio moderation" ON portfolio_moderation;

-- Portfolio Moderation: Artists view own; admins manage all
CREATE POLICY "Artists view own portfolio moderation" ON portfolio_moderation
  FOR SELECT USING (artist_id = auth.uid());

CREATE POLICY "System insert portfolio moderation" ON portfolio_moderation
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Moderators update portfolio moderation" ON portfolio_moderation
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (account_type = 'admin' OR account_type = 'moderator') -- [FIXED] Changed role to account_type
    )
  );

-- Drop old policies for rebooking_requests
DROP POLICY IF EXISTS "Customers view own rebooking requests" ON rebooking_requests;
DROP POLICY IF EXISTS "Artists view rebooking requests for them" ON rebooking_requests;
DROP POLICY IF EXISTS "Customers create rebooking requests" ON rebooking_requests;
DROP POLICY IF EXISTS "Users update own rebooking requests" ON rebooking_requests;

-- Rebooking Requests: Both parties can view and interact
CREATE POLICY "Customers view own rebooking requests" ON rebooking_requests
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Artists view rebooking requests for them" ON rebooking_requests
  FOR SELECT USING (artist_id = auth.uid());

CREATE POLICY "Customers create rebooking requests" ON rebooking_requests
  FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users update own rebooking requests" ON rebooking_requests
  FOR UPDATE USING (
    customer_id = auth.uid() OR 
    artist_id = auth.uid()
  );

-- 6. RPC: CALCULATE TRUST SCORE
-- Computes artist trust score based on multiple factors
CREATE OR REPLACE FUNCTION calculate_trust_score(p_artist_id UUID)
RETURNS TABLE (
  trust_score INTEGER,
  trust_level TEXT,
  completed_bookings INTEGER,
  total_reviews INTEGER,
  average_rating NUMERIC,
  completion_rate NUMERIC,
  response_rate NUMERIC,
  cancellation_rate NUMERIC,
  verified_badge BOOLEAN,
  badges TEXT[]
) AS $$
DECLARE
  v_completed INTEGER;
  v_total INTEGER;
  v_reviews INTEGER;
  v_avg_rating NUMERIC;
  v_completion NUMERIC;
  v_cancellation NUMERIC;
  v_verified BOOLEAN;
  v_badges TEXT[] := '{}';
  v_score INTEGER := 50; -- Base score
  v_level TEXT;
BEGIN
  -- Get booking statistics
  SELECT 
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'cancelled')
  INTO v_completed, v_total, v_cancellation
  FROM bookings
  WHERE artist_id = p_artist_id AND created_at > NOW() - INTERVAL '12 months';

  -- Calculate rates
  IF v_total > 0 THEN
    v_completion := (v_completed::NUMERIC / v_total::NUMERIC) * 100;
    v_cancellation := (v_cancellation::NUMERIC / v_total::NUMERIC) * 100;
  ELSE
    v_completion := 0;
    v_cancellation := 0;
  END IF;

  -- Get review statistics
  SELECT COUNT(*), COALESCE(AVG(rating), 0)
  INTO v_reviews, v_avg_rating
  FROM reviews
  WHERE artist_id = p_artist_id AND is_verified = true;

  -- Check verification status [FIXED to use sellers table as per MITHAS GLOW schema]
  SELECT is_verified INTO v_verified
  FROM sellers
  WHERE user_id = p_artist_id;

  -- Default to false if no record found
  IF v_verified IS NULL THEN
    v_verified := false;
  END IF;

  -- Calculate score components
  IF v_completed >= 10 THEN v_score := v_score + 10; END IF;
  IF v_completed >= 50 THEN v_score := v_score + 10; END IF;
  IF v_completed >= 100 THEN v_score := v_score + 5; END IF;
  
  IF v_avg_rating >= 4.5 THEN v_score := v_score + 15;
  ELSIF v_avg_rating >= 4.0 THEN v_score := v_score + 10;
  ELSIF v_avg_rating >= 3.5 THEN v_score := v_score + 5;
  END IF;
  
  IF v_completion >= 90 THEN v_score := v_score + 10;
  ELSIF v_completion >= 75 THEN v_score := v_score + 5;
  END IF;
  
  IF v_cancellation <= 5 THEN v_score := v_score + 10;
  ELSIF v_cancellation <= 10 THEN v_score := v_score + 5;
  END IF;
  
  IF v_verified THEN v_score := v_score + 10; END IF;
  
  -- Cap score at 100
  v_score := LEAST(v_score, 100);

  -- Determine badges
  IF v_verified THEN v_badges := array_append(v_badges, 'verified'); END IF;
  IF v_avg_rating >= 4.8 AND v_reviews >= 20 THEN v_badges := array_append(v_badges, 'top_rated'); END IF;
  IF v_completion >= 95 THEN v_badges := array_append(v_badges, 'reliable'); END IF;
  IF v_completed >= 100 THEN v_badges := array_append(v_badges, 'experienced'); END IF;

  -- Determine trust level
  IF v_score >= 90 THEN v_level := 'exceptional';
  ELSIF v_score >= 75 THEN v_level := 'high';
  ELSIF v_score >= 50 THEN v_level := 'medium';
  ELSE v_level := 'low';
  END IF;

  RETURN QUERY SELECT 
    v_score,
    v_level,
    v_completed,
    v_reviews,
    v_avg_rating,
    v_completion,
    NULL::NUMERIC, -- response_rate (requires messaging data)
    v_cancellation,
    v_verified,
    v_badges;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RPC: CREATE REBOOKING REQUEST
CREATE OR REPLACE FUNCTION create_rebooking_request(
  p_original_booking_id UUID,
  p_requested_date DATE DEFAULT NULL,
  p_requested_time TIME DEFAULT NULL,
  p_message TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  rebooking_id UUID,
  error_message TEXT
) AS $$
DECLARE
  v_original_booking RECORD;
  v_rebooking_id UUID;
BEGIN
  -- Validate original booking exists and belongs to caller
  SELECT * INTO v_original_booking
  FROM bookings
  WHERE id = p_original_booking_id AND customer_id = auth.uid();

  IF v_original_booking IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Original booking not found or unauthorized';
    RETURN;
  END IF;

  -- Verify original booking was completed
  IF v_original_booking.status != 'completed' THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Can only rebook completed bookings';
    RETURN;
  END IF;

  -- Create rebooking request
  INSERT INTO rebooking_requests (
    original_booking_id,
    customer_id,
    artist_id,
    service_id,
    requested_date,
    requested_time,
    customer_message
  ) VALUES (
    p_original_booking_id,
    auth.uid(),
    v_original_booking.artist_id,
    v_original_booking.service_id,
    p_requested_date,
    p_requested_time,
    p_message
  ) RETURNING id INTO v_rebooking_id;

  RETURN QUERY SELECT true, v_rebooking_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. RPC: UPDATE USER RISK PROFILE (PROGRESSIVE ENFORCEMENT)
CREATE OR REPLACE FUNCTION update_user_risk_profile(
  p_user_id UUID,
  p_event_type TEXT,
  p_risk_score INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_current_score INTEGER;
  v_new_score INTEGER;
  v_violation_count INTEGER;
  v_enforcement_level TEXT;
BEGIN
  -- Get or create risk profile
  INSERT INTO user_risk_profiles (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update profile with new violation
  UPDATE user_risk_profiles
  SET 
    risk_score = LEAST(risk_score + p_risk_score, 100),
    violation_count = violation_count + 1,
    last_violation_at = NOW(),
    violation_categories = array_append(violation_categories, p_event_type),
    enforcement_level = CASE 
      WHEN risk_score + p_risk_score >= 90 THEN 'suspended'
      WHEN risk_score + p_risk_score >= 75 THEN 'review'
      WHEN risk_score + p_risk_score >= 50 THEN 'restricted'
      WHEN risk_score + p_risk_score >= 25 THEN 'blocked'
      WHEN risk_score + p_risk_score >= 10 THEN 'warning'
      ELSE 'none'
    END,
    cooldown_until = CASE 
      WHEN risk_score + p_risk_score >= 50 THEN NOW() + INTERVAL '24 hours'
      WHEN risk_score + p_risk_score >= 25 THEN NOW() + INTERVAL '1 hour'
      ELSE cooldown_until
    END,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
