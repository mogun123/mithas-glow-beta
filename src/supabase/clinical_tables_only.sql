-- CLINICAL ANALYSIS TABLES ONLY
-- Run this script to add clinical tables to existing Supabase database
-- This script handles existing types and tables gracefully

-- =====================================================
-- CLINICAL ANALYSIS TABLES
-- =====================================================

-- Clinical Analyses Table
CREATE TABLE IF NOT EXISTS public.clinical_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Session & Analysis Info
  session_id TEXT NOT NULL,
  skin_tone TEXT NOT NULL,
  undertone TEXT NOT NULL,
  skin_type TEXT NOT NULL,
  
  -- Overall Skin Health Score (single source of truth from clinicalMetricsEngine)
  overall_skin_health_score INTEGER NOT NULL,
  
  -- Clinical Metrics (0-100 scale)
  metrics JSONB NOT NULL DEFAULT '{}',
  -- Structure: { acne: 0-100, redness: 0-100, oiliness: 0-100, moisture: 0-100, texture: 0-100, pores: 0-100, pigment: 0-100, darkCircle: 0-100, elasticity: 0-100, glassSkin: 0-100, overallSkinHealthScore: 0-100 }
  
  -- Spatial Data (coordinates for spot visualization)
  spatial_data JSONB NOT NULL DEFAULT '{}',
  -- Structure: { acneClusters: [{x, y, intensity}], oilSpots: [...], rednessClusters: [...], melaninClusters: [...], porePoints: [...], underEyeRegions: [...]}
  
  -- Frame Data (images for different angles)
  frame_data JSONB NOT NULL DEFAULT '{}',
  -- Structure: { center: {image, timestamp}, left: {image, timestamp}, right: {image, timestamp} }
  
  -- LAB Color Values (for clinical accuracy)
  lab_values JSONB NOT NULL DEFAULT '{}',
  -- Structure: { overall: {l, a, b}, forehead: {l, a, b}, leftCheek: {l, a, b}, rightCheek: {l, a, b}, nose: {l, a, b}, chin: {l, a, b} }
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinical Metrics History Table (for tracking trends)
CREATE TABLE IF NOT EXISTS public.clinical_metrics_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Analysis Date
  analysis_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Metrics Snapshot
  metrics JSONB NOT NULL DEFAULT '{}',
  -- Structure: { acne: 0-100, redness: 0-100, oiliness: 0-100, moisture: 0-100, texture: 0-100 }
  
  -- Improvements (compared to previous analysis)
  improvements JSONB NOT NULL DEFAULT '{}',
  -- Structure: { acne: improvement_score, redness: improvement_score, oiliness: improvement_score, moisture: improvement_score, texture: improvement_score }
  
  -- AI Recommendations
  recommendations TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Skin Profiles (for quick access to latest analysis)
-- Handle existing table gracefully
DO $$
BEGIN
    -- Check if table exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_skin_profiles') THEN
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
    ELSE
        -- Table exists, check if last_updated column exists and add it if needed
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_skin_profiles' 
            AND column_name = 'last_updated'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.user_skin_profiles ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        -- Check if created_at column exists and add it if needed
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_skin_profiles' 
            AND column_name = 'created_at'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE public.user_skin_profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- =====================================================
-- CLINICAL TABLE INDEXES
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
CREATE INDEX IF NOT EXISTS idx_user_skin_profiles_updated ON public.user_skin_profiles(last_updated DESC);

-- =====================================================
-- CLINICAL TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on clinical tables (only if not already enabled)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'clinical_analyses' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.clinical_analyses ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'clinical_metrics_history' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.clinical_metrics_history ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user_skin_profiles' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.user_skin_profiles ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop existing policies if they exist, then create new ones
DROP POLICY IF EXISTS "Users can manage own clinical analyses" ON public.clinical_analyses;
DROP POLICY IF EXISTS "Users can read own metrics history" ON public.clinical_metrics_history;
DROP POLICY IF EXISTS "Users can insert own metrics history" ON public.clinical_metrics_history;
DROP POLICY IF EXISTS "Users can manage own skin profile" ON public.user_skin_profiles;

-- Clinical Analyses: Users can manage own analyses
CREATE POLICY "Users can manage own clinical analyses"
  ON public.clinical_analyses FOR ALL
  USING (user_id = auth.uid());

-- Clinical Metrics History: Users can read own history
CREATE POLICY "Users can read own metrics history"
  ON public.clinical_metrics_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own metrics history"
  ON public.clinical_metrics_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- User Skin Profiles: Users can manage own profile
CREATE POLICY "Users can manage own skin profile"
  ON public.user_skin_profiles FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- CLINICAL TABLE TRIGGERS
-- =====================================================

-- Update updated_at timestamp function (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to clinical tables (drop if exists first)
DROP TRIGGER IF EXISTS update_clinical_analyses_updated_at ON public.clinical_analyses;
DROP TRIGGER IF EXISTS update_user_skin_profiles_updated_at ON public.user_skin_profiles;

CREATE TRIGGER update_clinical_analyses_updated_at BEFORE UPDATE ON public.clinical_analyses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

-- Apply trigger (drop if exists first)
DROP TRIGGER IF EXISTS update_user_skin_profile_trigger ON public.clinical_analyses;

CREATE TRIGGER update_user_skin_profile_trigger AFTER INSERT ON public.clinical_analyses
  FOR EACH ROW EXECUTE FUNCTION update_user_skin_profile();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Clinical analysis tables created successfully!';
    RAISE NOTICE '📊 Tables: clinical_analyses, clinical_metrics_history, user_skin_profiles';
    RAISE NOTICE '🔒 RLS policies enabled for user data protection';
    RAISE NOTICE '⚡ Indexes and triggers configured for performance';
END $$;
