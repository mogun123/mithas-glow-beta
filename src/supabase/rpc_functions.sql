-- RPC Functions for Skin Journey and Gamification
-- This file contains all the necessary database functions for the MITHAS SKIN AI application

-- Get Active Glow Journey
CREATE OR REPLACE FUNCTION public.get_active_glow_journey(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  status TEXT,
  progress JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  total_scans INTEGER,
  streak_days INTEGER,
  glow_points INTEGER,
  xp_earned INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gj.id,
    gj.user_id,
    gj.start_date,
    gj.end_date,
    gj.status,
    gj.progress,
    gj.created_at,
    gj.updated_at,
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

-- Create Glow Journey
CREATE OR REPLACE FUNCTION public.create_glow_journey(
  p_user_id UUID,
  p_duration_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
  journey_id UUID;
BEGIN
  INSERT INTO public.glow_journeys (
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
    NOW() + (p_duration_days || ' days')::INTERVAL,
    'active',
    '{"completed_days": 0, "current_streak": 0, "milestones": []}'::JSONB,
    NOW(),
    NOW()
  ) RETURNING id INTO journey_id;
  
  RETURN journey_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Journey Progress
CREATE OR REPLACE FUNCTION public.update_journey_progress(
  p_journey_id UUID,
  p_progress JSONB
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.glow_journeys 
  SET 
    progress = p_progress,
    updated_at = NOW()
  WHERE id = p_journey_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get User Gamification
CREATE OR REPLACE FUNCTION public.get_user_gamification(p_user_id UUID)
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
    gj.user_id,
    COALESCE(FLOOR(gj.xp_earned / 100)::INTEGER, 1) AS level,
    gj.glow_points AS points,
    gj.streak_days AS streak,
    gj.badges_earned AS badges,
    '{}'::JSONB AS achievements,
    gj.created_at,
    gj.updated_at
  FROM public.glow_journeys gj
  WHERE gj.user_id = p_user_id
    AND gj.status IN ('active', 'paused')
  ORDER BY gj.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update User Gamification
CREATE OR REPLACE FUNCTION public.update_user_gamification(
  p_user_id UUID,
  p_points INTEGER DEFAULT 0,
  p_streak INTEGER DEFAULT 0,
  p_badges TEXT[] DEFAULT '{}',
  p_achievements JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.glow_journeys
  SET
    glow_points = p_points,
    streak_days = p_streak,
    badges_earned = p_badges,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND status IN ('active', 'paused');
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get User Insights
CREATE OR REPLACE FUNCTION public.get_user_insights(p_user_id UUID)
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
  FROM public.clinical_analyses ca
  WHERE ca.user_id = p_user_id
  GROUP BY p_user_id;
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_active_glow_journey TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_glow_journey TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_journey_progress TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_gamification TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_gamification TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_insights TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_full_transformation_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_journey_streak TO authenticated;
