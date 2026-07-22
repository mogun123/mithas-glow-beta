-- Fix save_full_transformation_data to match LIVE glow_journeys schema.
-- Live columns: id, user_id, status, start_date, end_date, progress, created_at, updated_at
-- Broken behavior: RPC updated total_scans (column does not exist) → 42703 → Start Journey failed.

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
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_journey_id UUID := p_journey_id;
  v_analysis_id UUID;
  v_scan_count INTEGER;
BEGIN
  IF v_journey_id IS NULL THEN
    SELECT gj.id INTO v_journey_id
    FROM public.glow_journeys gj
    WHERE gj.user_id = p_user_id
      AND gj.status IN ('active', 'paused')
    ORDER BY gj.created_at DESC
    LIMIT 1;

    IF v_journey_id IS NULL THEN
      INSERT INTO public.glow_journeys (
        user_id,
        status,
        start_date,
        end_date,
        progress
      )
      VALUES (
        p_user_id,
        'active',
        NOW(),
        NOW() + INTERVAL '30 days',
        jsonb_build_object(
          'total_scans', 0,
          'completed_days', 0,
          'current_streak', 0
        )
      )
      RETURNING id INTO v_journey_id;
    END IF;
  END IF;

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

  -- Live schema stores counters inside progress JSONB (no total_scans column)
  SELECT COALESCE((progress->>'total_scans')::INTEGER, 0) + 1
  INTO v_scan_count
  FROM public.glow_journeys
  WHERE id = v_journey_id;

  UPDATE public.glow_journeys
  SET
    progress = jsonb_set(
      COALESCE(progress, '{}'::jsonb),
      '{total_scans}',
      to_jsonb(v_scan_count),
      true
    ),
    updated_at = NOW()
  WHERE id = v_journey_id;

  RETURN v_analysis_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_full_transformation_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_full_transformation_data TO anon;
