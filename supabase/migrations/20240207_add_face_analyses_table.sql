-- Add face_analyses table for storing AI face analysis results
CREATE TABLE IF NOT EXISTS public.face_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  skin_tone TEXT NOT NULL,
  face_shape TEXT NOT NULL,
  skin_issues TEXT[] DEFAULT '{}',
  recommendations JSONB DEFAULT '{}',
  mode TEXT NOT NULL,
  confidence_score DECIMAL(5,2),
  analysis_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_face_analyses_user_id ON public.face_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_face_analyses_created_at ON public.face_analyses(created_at DESC);

-- Add RLS policies
ALTER TABLE public.face_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own face analyses"
  ON public.face_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own face analyses"
  ON public.face_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own face analyses"
  ON public.face_analyses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own face analyses"
  ON public.face_analyses FOR DELETE
  USING (auth.uid() = user_id);
