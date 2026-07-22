-- RPC FUNCTIONS FOR SKIN JOURNEY AND GAMIFICATION
-- These functions are required by the frontend journey system

-- =====================================================
-- GET ACTIVE GLOW JOURNEY
-- =====================================================

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

-- =====================================================
-- CREATE GLOW JOURNEY
-- =====================================================

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

-- =====================================================
-- UPDATE JOURNEY PROGRESS
-- =====================================================

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

-- =====================================================
-- GET USER GAMIFICATION PROFILE
-- =====================================================

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

-- =====================================================
-- UPDATE USER GAMIFICATION
-- =====================================================

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

-- =====================================================
-- GET USER INSIGHTS
-- =====================================================

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
-- CREATE GLOW JOURNEYS TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS glow_journeys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  progress JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_glow_journeys_user_id ON glow_journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_glow_journeys_status ON glow_journeys(status);
CREATE INDEX IF NOT EXISTS idx_glow_journeys_created_at ON glow_journeys(created_at DESC);

-- =====================================================
-- CREATE USER GAMIFICATION TABLE (if not exists)
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

-- CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_user_gamification_user_id ON user_gamification(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gamification_points ON user_gamification(points DESC);

-- =====================================================
-- ENABLE RLS
-- =====================================================

ALTER TABLE glow_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY "Users can manage own glow journeys" ON glow_journeys
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own gamification" ON user_gamification
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RPC FUNCTIONS CREATED SUCCESSFULLY';
    RAISE NOTICE '📊 Functions: get_active_glow_journey, create_glow_journey, update_journey_progress';
    RAISE NOTICE '🎮 Functions: get_user_gamification, update_user_gamification, get_user_insights';
    RAISE NOTICE '📋 Tables: glow_journeys, user_gamification';
    RAISE NOTICE '🔒 RLS policies enabled for journey and gamification tables';
END $$;
