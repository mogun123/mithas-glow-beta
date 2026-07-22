-- COMPLETE SCHEMA FIX FOR CLINICAL TABLES
-- This will create all clinical tables with proper columns and fix any missing issues

-- =====================================================
-- STEP 1: CLINICAL_ANALYSES TABLE
-- =====================================================

-- Drop and recreate clinical_analyses table to ensure clean state
DROP TABLE IF EXISTS public.clinical_analyses CASCADE;

CREATE TABLE public.clinical_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Session & Analysis Info
  session_id TEXT NOT NULL,
  skin_tone TEXT NOT NULL,
  undertone TEXT NOT NULL,
  skin_type TEXT NOT NULL,
  
  -- Clinical Metrics (0-100 scale)
  metrics JSONB NOT NULL DEFAULT '{}',
  
  -- Spatial Data (coordinates for spot visualization)
  spatial_data JSONB NOT NULL DEFAULT '{}',
  
  -- Frame Data (images for different angles)
  frame_data JSONB NOT NULL DEFAULT '{}',
  
  -- LAB Color Values (for clinical accuracy)
  lab_values JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 2: CLINICAL_METRICS_HISTORY TABLE
-- =====================================================

DROP TABLE IF EXISTS public.clinical_metrics_history CASCADE;

CREATE TABLE public.clinical_metrics_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Analysis Date
  analysis_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metrics Snapshot
  metrics JSONB NOT NULL DEFAULT '{}',
  
  -- Improvements (compared to previous analysis)
  improvements JSONB NOT NULL DEFAULT '{}',
  
  -- AI Recommendations
  recommendations TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 3: USER_SKIN_PROFILES TABLE (FIXED VERSION)
-- =====================================================

DROP TABLE IF EXISTS public.user_skin_profiles CASCADE;

CREATE TABLE public.user_skin_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Latest Analysis Reference
  latest_analysis_id UUID REFERENCES public.clinical_analyses(id) ON DELETE SET NULL,
  
  -- Current Skin Profile
  current_skin_tone TEXT,
  current_undertone TEXT,
  current_skin_type TEXT,
  
  -- Current Metrics Summary
  current_metrics JSONB DEFAULT '{}',
  
  -- Profile Preferences
  preferred_products TEXT[] DEFAULT '{}',
  skin_concerns TEXT[] DEFAULT '{}',
  
  -- Metadata
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STEP 4: INDEXES
-- =====================================================

-- Clinical Analyses Indexes
CREATE INDEX IF NOT EXISTS idx_clinical_analyses_user_id ON public.clinical_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_clinical_analyses_session_id ON public.clinical_analyses(session_id);
CREATE INDEX IF NOT EXISTS idx_clinical_analyses_created_at ON public.clinical_analyses(created_at DESC);

-- Clinical Metrics History Indexes
CREATE INDEX IF NOT EXISTS idx_clinical_metrics_history_user_id ON public.clinical_metrics_history(user_id);
CREATE INDEX IF NOT EXISTS idx_clinical_metrics_history_date ON public.clinical_metrics_history(analysis_date DESC);

-- User Skin Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_user_skin_profiles_user_id ON public.user_skin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skin_profiles_latest_analysis_id ON public.user_skin_profiles(latest_analysis_id);
CREATE INDEX IF NOT EXISTS idx_user_skin_profiles_updated ON public.user_skin_profiles(last_updated DESC);

-- =====================================================
-- STEP 5: RLS POLICIES
-- =====================================================

-- Enable RLS on clinical tables
ALTER TABLE public.clinical_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skin_profiles ENABLE ROW LEVEL SECURITY;

-- Clinical Analyses: Users can manage own analyses
DROP POLICY IF EXISTS "Users can manage own clinical analyses" ON public.clinical_analyses;
CREATE POLICY "Users can manage own clinical analyses"
  ON public.clinical_analyses FOR ALL
  USING (user_id = auth.uid());

-- Clinical Metrics History: Users can read own history
DROP POLICY IF EXISTS "Users can read own metrics history" ON public.clinical_metrics_history;
CREATE POLICY "Users can read own metrics history"
  ON public.clinical_metrics_history FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own metrics history" ON public.clinical_metrics_history;
CREATE POLICY "Users can insert own metrics history"
  ON public.clinical_metrics_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- User Skin Profiles: Users can manage own profile
DROP POLICY IF EXISTS "Users can manage own skin profile" ON public.user_skin_profiles;
CREATE POLICY "Users can manage own skin profile"
  ON public.user_skin_profiles FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- STEP 6: TRIGGERS
-- =====================================================

-- Update updated_at timestamp function (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to clinical tables
DROP TRIGGER IF EXISTS update_clinical_analyses_updated_at ON public.clinical_analyses;
CREATE TRIGGER update_clinical_analyses_updated_at BEFORE UPDATE ON public.clinical_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_skin_profiles_updated_at ON public.user_skin_profiles;
CREATE TRIGGER update_user_skin_profiles_updated_at BEFORE UPDATE ON public.user_skin_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update user skin profile when new analysis is created
DROP FUNCTION IF EXISTS update_user_skin_profile() CASCADE;
CREATE OR REPLACE FUNCTION update_user_skin_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_skin_profiles (
    user_id, 
    latest_analysis_id, 
    current_skin_tone, 
    current_undertone, 
    current_skin_type,
    current_metrics,
    last_updated
  ) VALUES (
    NEW.user_id,
    NEW.id,
    NEW.skin_tone,
    NEW.undertone,
    NEW.skin_type,
    NEW.metrics,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    latest_analysis_id = NEW.id,
    current_skin_tone = NEW.skin_tone,
    current_undertone = NEW.undertone,
    current_skin_type = NEW.skin_type,
    current_metrics = NEW.metrics,
    last_updated = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_skin_profile_trigger ON public.clinical_analyses;
CREATE TRIGGER update_user_skin_profile_trigger AFTER INSERT ON public.clinical_analyses
  FOR EACH ROW EXECUTE FUNCTION update_user_skin_profile();

-- =====================================================
-- STEP 7: VERIFICATION
-- =====================================================

-- Verify tables were created successfully
DO $$
BEGIN
    RAISE NOTICE '✅ CLINICAL TABLES SETUP COMPLETE';
    RAISE NOTICE '📊 Tables: clinical_analyses, clinical_metrics_history, user_skin_profiles';
    RAISE NOTICE '🔒 RLS policies enabled for all clinical tables';
    RAISE NOTICE '⚡ Indexes created for performance';
    RAISE NOTICE '🔧 Triggers configured for data consistency';
    RAISE NOTICE '🎯 latest_analysis_id column properly created in user_skin_profiles';
END $$;

-- Show final verification
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('clinical_analyses', 'clinical_metrics_history', 'user_skin_profiles')
AND table_schema = 'public'
AND column_name = 'latest_analysis_id'
ORDER BY table_name, column_name;
