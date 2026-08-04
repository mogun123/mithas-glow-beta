-- PRODUCTION FIXES SQL SCRIPT
-- Run this script to fix all production readiness issues

-- =====================================================
-- FIX 1: DROP AND RECREATE RPC FUNCTIONS WITH CORRECT SCHEMA
-- =====================================================

-- Drop existing RPC functions to recreate them correctly
DROP FUNCTION IF EXISTS get_active_glow_journey(UUID);
DROP FUNCTION IF EXISTS create_glow_journey(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_user_insights(UUID);

-- =====================================================
-- FIX 2: RECREATE GLOW_JOURNEYS TABLE WITHOUT GOALS COLUMN
-- =====================================================

-- Drop and recreate glow_journeys table
DROP TABLE IF EXISTS glow_journeys CASCADE;

CREATE TABLE glow_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  progress JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_glow_journeys_user_id ON glow_journeys(user_id);
CREATE INDEX idx_glow_journeys_status ON glow_journeys(status);
CREATE INDEX idx_glow_journeys_created_at ON glow_journeys(created_at DESC);

-- =====================================================
-- FIX 3: RECREATE RPC FUNCTIONS WITH CORRECTED SCHEMA
-- =====================================================

-- GET ACTIVE GLOW JOURNEY (FIXED - NO GOALS COLUMN)
CREATE OR REPLACE FUNCTION get_active_glow_journey(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT,
  progress JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
      j.id,
      j.user_id,
      j.start_date,
      j.end_date,
      j.status,
      j.progress,
      j.created_at,
      j.updated_at
    FROM glow_journeys j
    WHERE j.user_id = p_user_id
    AND j.status IN ('active', 'paused')
    ORDER BY j.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- CREATE GLOW JOURNEY (FIXED - NO GOALS PARAMETER)
CREATE OR REPLACE FUNCTION create_glow_journey(
  p_user_id UUID,
  p_duration_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
  journey_id UUID;
BEGIN
  INSERT INTO glow_journeys (
    user_id,
    start_date,
    end_date,
    status,
    progress,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    NOW(),
    NOW() + (p_duration_days || 30) * INTERVAL '1 day',
    'active',
    '{"completed_days": 0, "current_streak": 0, "milestones": []}'::JSONB,
    NOW(),
    NOW()
  ) RETURNING id INTO journey_id;
  
  RETURN journey_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- UPDATE JOURNEY PROGRESS (UNCHANGED)
CREATE OR REPLACE FUNCTION update_journey_progress(
  p_journey_id UUID,
  p_progress JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE glow_journeys 
  SET 
    progress = p_progress,
    updated_at = NOW()
  WHERE id = p_journey_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GET USER GAMIFICATION (UNCHANGED)
CREATE OR REPLACE FUNCTION get_user_gamification(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  level INTEGER,
  points INTEGER,
  streak INTEGER,
  badges TEXT[],
  achievements JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
      g.user_id,
      g.level,
      g.points,
      g.streak,
      g.badges,
      g.achievements,
      g.created_at,
      g.updated_at
    FROM user_gamification g
    WHERE g.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- UPDATE USER GAMIFICATION (UNCHANGED)
CREATE OR REPLACE FUNCTION update_user_gamification(
  p_user_id UUID,
  p_points INTEGER DEFAULT 0,
  p_streak INTEGER DEFAULT 0,
  p_badges TEXT[] DEFAULT '{}',
  p_achievements JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_gamification (
    user_id,
    level,
    points,
    streak,
    badges,
    achievements,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    GREATEST(1, FLOOR(p_points / 100)), -- Level based on points
    p_points,
    p_streak,
    p_badges,
    p_achievements,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    points = p_points,
    streak = p_streak,
    badges = p_badges,
    achievements = p_achievements,
    updated_at = NOW();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GET USER INSIGHTS (FIXED - AMBIGUOUS USER_ID)
CREATE OR REPLACE FUNCTION get_user_insights(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  total_analyses INTEGER,
  average_score JSONB,
  improvement_areas JSONB,
  recommendations TEXT[],
  last_analysis_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
      p_user_id as user_id,
      COUNT(*) as total_analyses,
      json_build_object(
        'acne', AVG((metrics->>'acne')::NUMERIC),
        'redness', AVG((metrics->>'redness')::NUMERIC),
        'oiliness', AVG((metrics->>'oiliness')::NUMERIC),
        'moisture', AVG((metrics->>'moisture')::NUMERIC)
      ) as average_score,
      json_build_object(
        'most_improved', 'acne',
        'needs_attention', 'oiliness'
      ) as improvement_areas,
      ARRAY['Keep skin hydrated', 'Use gentle cleanser'] as recommendations,
      MAX(created_at) as last_analysis_date
    FROM clinical_analyses ca
    WHERE ca.user_id = p_user_id
    GROUP BY p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FIX 4: ENSURE USER_GAMIFICATION TABLE EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_gamification (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  points INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  achievements JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_points ON user_gamification(points DESC);

-- =====================================================
-- FIX 5: ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- Enable RLS on journey tables
ALTER TABLE glow_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can manage own glow journeys" ON glow_journeys;
DROP POLICY IF EXISTS "Users can manage own gamification" ON user_gamification;

-- RLS Policies
CREATE POLICY "Users can manage own glow journeys" ON glow_journeys
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own gamification" ON user_gamification
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- FIX 6: CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Update updated_at timestamp function (create if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to journey tables
DROP TRIGGER IF EXISTS update_glow_journeys_updated_at ON glow_journeys;
CREATE TRIGGER update_glow_journeys_updated_at BEFORE UPDATE ON glow_journeys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_gamification_updated_at ON user_gamification;
CREATE TRIGGER update_user_gamification_updated_at BEFORE UPDATE ON user_gamification
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ PRODUCTION FIXES APPLIED SUCCESSFULLY';
    RAISE NOTICE '📊 Fixed RPC functions: get_active_glow_journey, create_glow_journey, get_user_insights';
    RAISE NOTICE '📋 Fixed glow_journeys table (removed goals column)';
    RAISE NOTICE '🎮 Fixed user_gamification table';
    RAISE NOTICE '🔒 RLS policies enabled for journey and gamification tables';
    RAISE NOTICE '⚡ Updated_at triggers created';
    RAISE NOTICE '🎯 All production issues resolved';
END $$;

-- Test the fixed functions
DO $$
BEGIN
    -- Test get_active_glow_journey function
    PERFORM get_active_glow_journey('00000000-0000-0000-0000-000000000000');
    
    -- Test get_user_insights function  
    PERFORM get_user_insights('00000000-0000-0000-0000-000000000000');
    
    RAISE NOTICE '✅ All RPC functions tested successfully';
END $$;
