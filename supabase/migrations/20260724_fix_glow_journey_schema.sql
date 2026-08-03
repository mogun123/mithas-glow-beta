-- Fix the glow_journey schema by adding all missing columns and updating functions
-- This resolves the "column 'total_scans' does not exist" error

-- First, update the glow_journeys table with all missing columns
ALTER TABLE public.glow_journeys
ADD COLUMN IF NOT EXISTS total_scans INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_scans INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS glow_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badges_earned TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS initial_recommendations JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS current_routine JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS improvement_areas TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS skin_goals TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS commitment_level TEXT CHECK (commitment_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS reminder_preferences JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS completion_date TIMESTAMP WITH TIME ZONE;

-- Now, let's make sure the face_analyses table exists and has all the correct columns
CREATE TABLE IF NOT EXISTS public.face_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES public.glow_journeys(id) ON DELETE CASCADE,
  
  -- Core Analysis Metrics
  final_redness_score DECIMAL(5,2) NOT NULL,
  final_texture_score DECIMAL(5,2) NOT NULL,
  melanin_index DECIMAL(5,2) NOT NULL,
  beard_density_score DECIMAL(5,2) DEFAULT 0,
  
  -- Detailed Analysis Results
  skin_tone_result JSONB NOT NULL,
  undertone_result JSONB NOT NULL,
  face_shape_result JSONB NOT NULL,
  skin_conditions_result JSONB NOT NULL,
  skin_age_result JSONB NOT NULL,
  confidence_result JSONB NOT NULL,
  lab_values JSONB NOT NULL,
  
  -- Computed Metrics
  overall_skin_health_score DECIMAL(5,2) GENERATED ALWAYS AS (
    (final_texture_score * 0.3) + 
    ((100 - final_redness_score) * 0.3) + 
    ((100 - COALESCE((skin_conditions_result->'conditions'->'acne'->'severity')::DECIMAL, 0)) * 0.25) + 
    (melanin_index * 0.15)
  ) STORED,
  
  -- Image Data
  scan_image_url TEXT,
  scan_metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  scan_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the other necessary tables
CREATE TABLE IF NOT EXISTS public.doctor_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Professional Information
  full_name TEXT NOT NULL,
  specialization TEXT NOT NULL CHECK (specialization IN ('dermatologist', 'cosmetologist', 'esthetician', 'trichologist')),
  license_number TEXT UNIQUE,
  years_of_experience INTEGER CHECK (years_of_experience >= 0),
  
  -- Credentials
  medical_degree TEXT,
  university TEXT,
  board_certifications TEXT[] DEFAULT '{}',
  specializations TEXT[] DEFAULT '{}',
  
  -- Practice Details
  clinic_name TEXT,
  clinic_address JSONB,
  consultation_fee DECIMAL(10,2),
  currency TEXT DEFAULT 'INR',
  available_services TEXT[] DEFAULT '{}',
  
  -- Availability
  consultation_duration INTEGER DEFAULT 30,
  available_days TEXT[] DEFAULT '{}',
  time_slots JSONB DEFAULT '{}',
  
  -- Ratings and Reviews
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_consultations INTEGER DEFAULT 0,
  patient_reviews JSONB DEFAULT '{}',
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents TEXT[] DEFAULT '{}',
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  
  -- Bio and Profile
  bio TEXT,
  profile_image_url TEXT,
  languages_spoken TEXT[] DEFAULT '{english}',
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_accepting_patients BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.consultations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.doctor_profiles(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES public.glow_journeys(id) ON DELETE SET NULL,
  
  -- Consultation Details
  consultation_type TEXT CHECK (consultation_type IN ('general', 'acne', 'anti_aging', 'pigmentation', 'hair_loss', 'other')) DEFAULT 'general',
  status TEXT CHECK (status IN ('booked', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')) DEFAULT 'booked',
  
  -- Scheduling
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER DEFAULT 30,
  time_zone TEXT DEFAULT 'Asia/Kolkata',
  
  -- Consultation Data
  chief_complaint TEXT,
  medical_history JSONB DEFAULT '{}',
  current_medications TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  skin_concerns TEXT[] DEFAULT '{}',
  
  -- Pre-consultation Analysis
  attached_analyses UUID[] DEFAULT '{}',
  pre_consultation_notes TEXT,
  
  -- Consultation Outcome
  diagnosis TEXT,
  treatment_plan JSONB DEFAULT '{}',
  prescription JSONB DEFAULT '{}',
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  
  -- Payment
  consultation_fee DECIMAL(10,2),
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed')) DEFAULT 'pending',
  payment_method TEXT,
  
  -- Session Details
  session_type TEXT CHECK (session_type IN ('video', 'audio', 'chat', 'in_person')) DEFAULT 'video',
  meeting_link TEXT,
  meeting_room_id TEXT,
  
  -- Feedback
  patient_rating INTEGER CHECK (patient_rating >= 1 AND patient_rating <= 5),
  patient_feedback TEXT,
  doctor_notes TEXT,
  
  -- Timestamps
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.glow_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  badge_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  badge_category TEXT CHECK (badge_category IN ('streak', 'improvement', 'consistency', 'milestone', 'special')) DEFAULT 'milestone',
  requirements JSONB NOT NULL,
  glow_points_reward INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.glow_badges(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES public.glow_journeys(id) ON DELETE SET NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, badge_id, journey_id)
);

CREATE TABLE IF NOT EXISTS public.ai_routine_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES public.glow_journeys(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.face_analyses(id) ON DELETE CASCADE,
  
  -- Routine Details
  routine_type TEXT CHECK (routine_type IN ('morning', 'evening', 'weekly', 'treatment')) DEFAULT 'morning',
  routine_data JSONB NOT NULL,
  ai_reasoning JSONB NOT NULL,
  
  -- Effectiveness Tracking
  user_feedback INTEGER CHECK (user_feedback >= 1 AND user_feedback <= 5),
  effectiveness_score DECIMAL(5,2),
  adherence_rate DECIMAL(5,2),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  replaced_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_face_analyses_user ON public.face_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_face_analyses_journey ON public.face_analyses(journey_id);
CREATE INDEX IF NOT EXISTS idx_face_analyses_timestamp ON public.face_analyses(scan_timestamp);
CREATE INDEX IF NOT EXISTS idx_face_analyses_health_score ON public.face_analyses(overall_skin_health_score);

CREATE INDEX IF NOT EXISTS idx_glow_journeys_user ON public.glow_journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_glow_journeys_status ON public.glow_journeys(status);
CREATE INDEX IF NOT EXISTS idx_glow_journeys_start_date ON public.glow_journeys(start_date);

CREATE INDEX IF NOT EXISTS idx_doctor_profiles_specialization ON public.doctor_profiles(specialization);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_active ON public.doctor_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_doctor_profiles_rating ON public.doctor_profiles(average_rating);

CREATE INDEX IF NOT EXISTS idx_consultations_user ON public.consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor ON public.consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON public.consultations(status);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON public.consultations(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_routine_user ON public.ai_routine_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_routine_journey ON public.ai_routine_history(journey_id);

-- Enable RLS for all tables (if not already enabled)
ALTER TABLE public.face_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glow_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.glow_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_routine_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Face Analyses
DROP POLICY IF EXISTS "Users can view own analyses" ON public.face_analyses;
CREATE POLICY "Users can view own analyses" ON public.face_analyses FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own analyses" ON public.face_analyses;
CREATE POLICY "Users can create own analyses" ON public.face_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own analyses" ON public.face_analyses;
CREATE POLICY "Users can update own analyses" ON public.face_analyses FOR UPDATE USING (auth.uid() = user_id);

-- Glow Journeys
DROP POLICY IF EXISTS "Users can view own journeys" ON public.glow_journeys;
CREATE POLICY "Users can view own journeys" ON public.glow_journeys FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own journeys" ON public.glow_journeys;
CREATE POLICY "Users can create own journeys" ON public.glow_journeys FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own journeys" ON public.glow_journeys;
CREATE POLICY "Users can update own journeys" ON public.glow_journeys FOR UPDATE USING (auth.uid() = user_id);

-- Doctor Profiles
DROP POLICY IF EXISTS "Doctor profiles are publicly viewable" ON public.doctor_profiles;
CREATE POLICY "Doctor profiles are publicly viewable" ON public.doctor_profiles FOR SELECT USING (is_active = true AND is_verified = true);

DROP POLICY IF EXISTS "Doctors can manage own profile" ON public.doctor_profiles;
CREATE POLICY "Doctors can manage own profile" ON public.doctor_profiles FOR ALL USING (auth.uid() = user_id);

-- Consultations
DROP POLICY IF EXISTS "Users can view own consultations" ON public.consultations;
CREATE POLICY "Users can view own consultations" ON public.consultations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Doctors can view assigned consultations" ON public.consultations;
CREATE POLICY "Doctors can view assigned consultations" ON public.consultations FOR SELECT USING (auth.uid() = doctor_id);

DROP POLICY IF EXISTS "Users can create consultations" ON public.consultations;
CREATE POLICY "Users can create consultations" ON public.consultations FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own consultations" ON public.consultations;
CREATE POLICY "Users can update own consultations" ON public.consultations FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Doctors can update consultations" ON public.consultations;
CREATE POLICY "Doctors can update consultations" ON public.consultations FOR UPDATE USING (auth.uid() = doctor_id);

-- Badges
DROP POLICY IF EXISTS "Badges are publicly viewable" ON public.glow_badges;
CREATE POLICY "Badges are publicly viewable" ON public.glow_badges FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own badges" ON public.user_badges;
CREATE POLICY "Users can view own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage badges" ON public.user_badges;
CREATE POLICY "System can manage badges" ON public.user_badges FOR ALL USING (auth.role() = 'service_role');

-- AI Routine
DROP POLICY IF EXISTS "Users can view own routines" ON public.ai_routine_history;
CREATE POLICY "Users can view own routines" ON public.ai_routine_history FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own routines" ON public.ai_routine_history;
CREATE POLICY "Users can create own routines" ON public.ai_routine_history FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own routines" ON public.ai_routine_history;
CREATE POLICY "Users can update own routines" ON public.ai_routine_history FOR UPDATE USING (auth.uid() = user_id);

-- Now let's update the RPC functions to use the correct column-based schema

-- Get Active Glow Journey
CREATE OR REPLACE FUNCTION public.get_active_glow_journey(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  start_date DATE,
  end_date DATE,
  total_scans INTEGER,
  streak_days INTEGER,
  glow_points INTEGER,
  xp_earned INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gj.id,
    gj.status,
    gj.start_date::DATE,
    COALESCE(gj.end_date::DATE, gj.start_date::DATE + 30),
    gj.total_scans,
    gj.streak_days,
    gj.glow_points,
    gj.xp_earned
  FROM public.glow_journeys gj
  WHERE gj.user_id = p_user_id 
    AND gj.status IN ('active', 'paused')
  ORDER BY gj.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Save Full Transformation Data
CREATE OR REPLACE FUNCTION public.save_full_transformation_data(
  p_user_id UUID,
  p_journey_id UUID DEFAULT NULL,
  p_redness_score DECIMAL,
  p_texture_score DECIMAL,
  p_melanin_index DECIMAL,
  p_beard_density DECIMAL DEFAULT 0,
  p_skin_tone JSONB,
  p_undertone JSONB,
  p_face_shape JSONB,
  p_skin_conditions JSONB,
  p_skin_age JSONB,
  p_confidence JSONB,
  p_lab_values JSONB,
  p_scan_image_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_journey_id UUID := p_journey_id;
  v_analysis_id UUID;
BEGIN
  -- Create or get active journey if not provided
  IF v_journey_id IS NULL THEN
    SELECT gj.id INTO v_journey_id
    FROM public.glow_journeys gj
    WHERE gj.user_id = p_user_id
      AND gj.status IN ('active', 'paused')
    ORDER BY gj.created_at DESC
    LIMIT 1;

    IF v_journey_id IS NULL THEN
      -- Create new journey
      INSERT INTO public.glow_journeys (user_id, status, start_date)
      VALUES (p_user_id, 'active', NOW())
      RETURNING id INTO v_journey_id;
    END IF;
  END IF;

  -- Save face analysis
  INSERT INTO public.face_analyses (
    user_id, 
    journey_id,
    final_redness_score,
    final_texture_score,
    melanin_index,
    beard_density_score,
    skin_tone_result,
    undertone_result,
    face_shape_result,
    skin_conditions_result,
    skin_age_result,
    confidence_result,
    lab_values,
    scan_image_url
  )
  VALUES (
    p_user_id,
    v_journey_id,
    p_redness_score,
    p_texture_score,
    p_melanin_index,
    p_beard_density,
    p_skin_tone,
    p_undertone,
    p_face_shape,
    p_skin_conditions,
    p_skin_age,
    p_confidence,
    p_lab_values,
    p_scan_image_url
  )
  RETURNING id INTO v_analysis_id;

  -- Update journey scan count
  UPDATE public.glow_journeys 
  SET 
    total_scans = total_scans + 1,
    updated_at = NOW()
  WHERE id = v_journey_id;

  RETURN v_analysis_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate Journey Streak
CREATE OR REPLACE FUNCTION public.calculate_journey_streak(p_journey_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_current_date DATE := CURRENT_DATE;
  v_scan_dates DATE[];
BEGIN
  -- Get all scan dates for this journey
  SELECT ARRAY_AGG(DATE(scan_timestamp)::DATE ORDER BY DATE(scan_timestamp))
  INTO v_scan_dates
  FROM public.face_analyses
  WHERE journey_id = p_journey_id;

  -- Calculate consecutive days
  IF v_scan_dates IS NOT NULL THEN
    LOOP
      EXIT WHEN NOT (v_current_date = ANY(v_scan_dates));
      v_streak := v_streak + 1;
      v_current_date := v_current_date - INTERVAL '1 day';
    END LOOP;
  END IF;

  -- Update journey with new streak
  UPDATE public.glow_journeys
  SET 
    streak_days = v_streak,
    longest_streak = GREATEST(longest_streak, v_streak),
    updated_at = NOW()
  WHERE id = p_journey_id;

  RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert Default Badges
INSERT INTO public.glow_badges (badge_code, name, description, icon_url, badge_category, requirements, glow_points_reward, xp_reward) VALUES
('first_scan', 'First Scan', 'Completed your first skin analysis', 'badges/first_scan.png', 'milestone', '{"type": "scan_count", "value": 1}'::jsonb, 10, 10),
('streak_3', '3 Day Streak', 'Scanned for 3 consecutive days', 'badges/streak_3.png', 'streak', '{"type": "streak_days", "value": 3}'::jsonb, 25, 20),
('streak_7', '7 Day Streak', 'Scanned for 7 consecutive days', 'badges/streak_7.png', 'streak', '{"type": "streak_days", "value": 7}'::jsonb, 50, 50),
('streak_14', '14 Day Streak', 'Scanned for 14 consecutive days', 'badges/streak_14.png', 'streak', '{"type": "streak_days", "value": 14}'::jsonb, 100, 100),
('streak_30', '30 Day Champion', 'Completed 30-day journey', 'badges/streak_30.png', 'milestone', '{"type": "journey_complete", "value": 30}'::jsonb, 200, 200),
('improver', 'Skin Improver', 'Showed measurable improvement', 'badges/improver.png', 'improvement', '{"type": "improvement_score", "value": 10}'::jsonb, 30, 30),
('consistent', 'Consistent Scanner', 'Maintained 80% scan consistency', 'badges/consistent.png', 'consistency', '{"type": "consistency_rate", "value": 80}'::jsonb, 40, 40)
ON CONFLICT (badge_code) DO NOTHING;

-- Grant Permissions
GRANT ALL ON public.face_analyses TO authenticated;
GRANT ALL ON public.glow_journeys TO authenticated;
GRANT SELECT ON public.doctor_profiles TO authenticated;
GRANT ALL ON public.consultations TO authenticated;
GRANT SELECT ON public.glow_badges TO authenticated;
GRANT ALL ON public.user_badges TO authenticated;
GRANT ALL ON public.ai_routine_history TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_active_glow_journey TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_full_transformation_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_journey_streak TO authenticated;
