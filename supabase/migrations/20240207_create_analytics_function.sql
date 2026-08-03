-- Function to get analytics insights
CREATE OR REPLACE FUNCTION get_user_analytics_summary(
  user_id_param UUID,
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT,
  last_occurrence TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    event_type,
    COUNT(*) as event_count,
    MAX(timestamp) as last_occurrence
  FROM public.analytics_events
  WHERE user_id = user_id_param 
    AND timestamp >= NOW() - INTERVAL '1 day' * days_back
  GROUP BY event_type
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql;
