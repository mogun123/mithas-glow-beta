-- Real-time Metrics Tracking for MITHAS GLOW
-- Add to existing supabase schema

-- Content metrics table for tracking views, likes, saves, shares
CREATE TABLE IF NOT EXISTS public.content_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content_id UUID NOT NULL, -- References products, reels, looks, etc.
  content_type TEXT NOT NULL CHECK (content_type IN ('product', 'reel', 'look', 'tutorial', 'event')),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'save', 'share', 'purchase')),
  duration_seconds INTEGER, -- For views, how long they watched
  context JSONB DEFAULT '{}', -- Additional context (feed position, source, etc.)
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Prevent duplicate interactions
  UNIQUE(content_id, user_id, interaction_type)
);

-- Content aggregates table for fast metric queries
CREATE TABLE IF NOT EXISTS public.content_aggregates (
  content_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  total_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0,
  total_view_duration_seconds INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (content_id, content_type)
);

-- Real-time sessions for tracking active users
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  current_content_id UUID,
  current_content_type TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_metrics_content ON public.content_metrics(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_metrics_user ON public.content_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_content_metrics_type ON public.content_metrics(interaction_type);
CREATE INDEX IF NOT EXISTS idx_content_metrics_created ON public.content_metrics(created_at);

CREATE INDEX IF NOT EXISTS idx_content_aggregates_content ON public.content_aggregates(content_id, content_type);
CREATE INDEX IF NOT EXISTS idx_content_aggregates_updated ON public.content_aggregates(updated_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON public.user_sessions(last_activity);

-- RLS Policies
ALTER TABLE public.content_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Content metrics policies
CREATE POLICY "Users can view content metrics" ON public.content_metrics FOR SELECT USING (true);
CREATE POLICY "Users can insert own interactions" ON public.content_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Content aggregates policies
CREATE POLICY "Content aggregates are publicly viewable" ON public.content_aggregates FOR SELECT USING (true);

-- User sessions policies
CREATE POLICY "Users can manage own sessions" ON public.user_sessions FOR ALL USING (auth.uid() = user_id);

-- Function to update aggregates when new interaction is recorded
CREATE OR REPLACE FUNCTION public.update_content_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.content_aggregates (content_id, content_type, total_views, total_likes, total_saves, total_shares, total_purchases, updated_at)
  VALUES (NEW.content_id, NEW.content_type, 
    CASE WHEN NEW.interaction_type = 'view' THEN 1 ELSE 0 END,
    CASE WHEN NEW.interaction_type = 'like' THEN 1 ELSE 0 END,
    CASE WHEN NEW.interaction_type = 'save' THEN 1 ELSE 0 END,
    CASE WHEN NEW.interaction_type = 'share' THEN 1 ELSE 0 END,
    CASE WHEN NEW.interaction_type = 'purchase' THEN 1 ELSE 0 END,
    NOW())
  ON CONFLICT (content_id, content_type) DO UPDATE SET
    total_views = content_aggregates.total_views + CASE WHEN NEW.interaction_type = 'view' THEN 1 ELSE 0 END,
    total_likes = content_aggregates.total_likes + CASE WHEN NEW.interaction_type = 'like' THEN 1 ELSE 0 END,
    total_saves = content_aggregates.total_saves + CASE WHEN NEW.interaction_type = 'save' THEN 1 ELSE 0 END,
    total_shares = content_aggregates.total_shares + CASE WHEN NEW.interaction_type = 'share' THEN 1 ELSE 0 END,
    total_purchases = content_aggregates.total_purchases + CASE WHEN NEW.interaction_type = 'purchase' THEN 1 ELSE 0 END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update aggregates
CREATE TRIGGER update_content_aggregates_trigger
  AFTER INSERT ON public.content_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_content_aggregates();

-- Function to get real-time metrics for content
CREATE OR REPLACE FUNCTION public.get_content_metrics(p_content_id UUID, p_content_type TEXT)
RETURNS TABLE (
  total_views BIGINT,
  total_likes BIGINT,
  total_saves BIGINT,
  total_shares BIGINT,
  total_purchases BIGINT,
  unique_viewers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ca.total_views, 0)::BIGINT,
    COALESCE(ca.total_likes, 0)::BIGINT,
    COALESCE(ca.total_saves, 0)::BIGINT,
    COALESCE(ca.total_shares, 0)::BIGINT,
    COALESCE(ca.total_purchases, 0)::BIGINT,
    COALESCE(
      (SELECT COUNT(DISTINCT user_id)::BIGINT 
       FROM public.content_metrics 
       WHERE content_id = p_content_id AND content_type = p_content_type AND interaction_type = 'view'), 
      0
    )
  FROM public.content_aggregates ca
  WHERE ca.content_id = p_content_id AND ca.content_type = p_content_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a view
CREATE OR REPLACE FUNCTION public.record_view(
  p_content_id UUID,
  p_content_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL,
  p_context JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.content_metrics (content_id, content_type, user_id, interaction_type, duration_seconds, context)
  VALUES (p_content_id, p_content_type, p_user_id, 'view', p_duration_seconds, p_context)
  ON CONFLICT (content_id, user_id, interaction_type) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a like
CREATE OR REPLACE FUNCTION public.record_like(
  p_content_id UUID,
  p_content_type TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.content_metrics (content_id, content_type, user_id, interaction_type)
  VALUES (p_content_id, p_content_type, p_user_id, 'like')
  ON CONFLICT (content_id, user_id, interaction_type) DO UPDATE SET
    created_at = NOW(); -- Update timestamp for re-likes
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record a save
CREATE OR REPLACE FUNCTION public.record_save(
  p_content_id UUID,
  p_content_type TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.content_metrics (content_id, content_type, user_id, interaction_type)
  VALUES (p_content_id, p_content_type, p_user_id, 'save')
  ON CONFLICT (content_id, user_id, interaction_type) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION public.get_content_metrics TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_view TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_like TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_save TO authenticated;

-- Enable real-time for content_aggregates table
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_aggregates;
