-- Skin Tone Analysis and Matching System for MITHAS GLOW
-- Add to existing supabase schema

-- User skin tone profiles
CREATE TABLE IF NOT EXISTS public.user_skin_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  skin_tone TEXT NOT NULL,
  undertone TEXT CHECK (undertone IN ('warm', 'cool', 'neutral')) NOT NULL,
  complexion TEXT CHECK (complexion IN ('fair', 'light', 'medium', 'tan', 'deep')) NOT NULL,
  hex_color TEXT NOT NULL,
  recommendations TEXT[] DEFAULT '{}',
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Product shade information
CREATE TABLE IF NOT EXISTS public.product_shades (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  shade_name TEXT NOT NULL,
  hex_code TEXT NOT NULL,
  skin_tone_match TEXT[] DEFAULT '{}', -- Array of suitable skin tones
  undertone TEXT CHECK (undertone IN ('warm', 'cool', 'neutral')),
  complexion_match TEXT[] DEFAULT '{}', -- Array of suitable complexions
  is_best_seller BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product matching cache (for performance)
CREATE TABLE IF NOT EXISTS public.product_skin_matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  match_score INTEGER CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons TEXT[] DEFAULT '{}',
  recommended_shades TEXT[] DEFAULT '{}',
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Skin tone analysis logs (for ML improvement)
CREATE TABLE IF NOT EXISTS public.skin_analysis_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_image_url TEXT,
  analysis_result JSONB,
  processing_time_ms INTEGER,
  model_version TEXT,
  confidence_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_skin_profiles_user ON public.user_skin_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skin_profiles_undertone ON public.user_skin_profiles(undertone);
CREATE INDEX IF NOT EXISTS idx_user_skin_profiles_complexion ON public.user_skin_profiles(complexion);

CREATE INDEX IF NOT EXISTS idx_product_shades_product ON public.product_shades(product_id);
CREATE INDEX IF NOT EXISTS idx_product_shades_undertone ON public.product_shades(undertone);
CREATE INDEX IF NOT EXISTS idx_product_shades_skin_tone_match ON public.product_shades USING GIN(skin_tone_match);

CREATE INDEX IF NOT EXISTS idx_product_skin_matches_user ON public.product_skin_matches(user_id);
CREATE INDEX IF NOT EXISTS idx_product_skin_matches_product ON public.product_skin_matches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_skin_matches_score ON public.product_skin_matches(match_score);

CREATE INDEX IF NOT EXISTS idx_skin_analysis_logs_user ON public.skin_analysis_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_skin_analysis_logs_created ON public.skin_analysis_logs(created_at);

-- RLS Policies
ALTER TABLE public.user_skin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_shades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_skin_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skin_analysis_logs ENABLE ROW LEVEL SECURITY;

-- User skin profiles policies
CREATE POLICY "Users can view own skin profile" ON public.user_skin_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own skin profile" ON public.user_skin_profiles FOR ALL USING (auth.uid() = user_id);

-- Product shades policies
CREATE POLICY "Product shades are publicly viewable" ON public.product_shades FOR SELECT USING (true);
CREATE POLICY "Sellers can manage own product shades" ON public.product_shades FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_shades.product_id 
    AND products.seller_id = auth.uid()
  )
);

-- Product skin matches policies
CREATE POLICY "Users can view own product matches" ON public.product_skin_matches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own product matches" ON public.product_skin_matches FOR ALL USING (auth.uid() = user_id);

-- Skin analysis logs policies
CREATE POLICY "Users can view own analysis logs" ON public.skin_analysis_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own analysis logs" ON public.skin_analysis_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to calculate product match score
CREATE OR REPLACE FUNCTION public.calculate_product_match(
  p_user_id UUID,
  p_product_id UUID
)
RETURNS TABLE (
  match_score INTEGER,
  match_reasons TEXT[],
  recommended_shades TEXT[]
) AS $$
DECLARE
  v_skin_profile RECORD;
  v_product RECORD;
  v_score INTEGER := 50; -- Base score
  v_reasons TEXT[] := '{}';
  v_shades TEXT[] := '{}';
BEGIN
  -- Get user's skin profile
  SELECT * INTO v_skin_profile 
  FROM public.user_skin_profiles 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Get product information
  SELECT p.*, array_agg(ps.shade_name) as available_shades
  INTO v_product
  FROM public.products p
  LEFT JOIN public.product_shades ps ON p.id = ps.product_id
  WHERE p.id = p_product_id
  GROUP BY p.id;
  
  IF NOT FOUND THEN
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Calculate match score based on undertone
  IF v_product.undertone = v_skin_profile.undertone THEN
    v_score := v_score + 25;
    v_reasons := array_append(v_reasons, 'Perfect undertone match');
  ELSIF v_product.undertone = 'neutral' THEN
    v_score := v_score + 15;
    v_reasons := array_append(v_reasons, 'Neutral undertone suits all');
  END IF;
  
  -- Check for suitable shades
  SELECT array_agg(ps.shade_name) INTO v_shades
  FROM public.product_shades ps
  WHERE ps.product_id = p_product_id
  AND (
    ps.undertone = v_skin_profile.undertone
    OR v_skin_profile.complexion = ANY(ps.complexion_match)
    OR v_skin_profile.skin_tone = ANY(ps.skin_tone_match)
  );
  
  IF v_shades IS NOT NULL AND array_length(v_shades, 1) > 0 THEN
    v_score := v_score + 20;
    v_reasons := array_append(v_reasons, 'Available in recommended shades');
  END IF;
  
  -- Bonus for target complexion match
  IF v_product.target_complexion = v_skin_profile.complexion THEN
    v_score := v_score + 10;
    v_reasons := array_append(v_reasons, 'Formulated for your complexion');
  END IF;
  
  -- Ensure score doesn't exceed 100
  v_score := LEAST(v_score, 100);
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's recommended products
CREATE OR REPLACE FUNCTION public.get_recommended_products(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  product_id UUID,
  match_score INTEGER,
  match_reasons TEXT[],
  recommended_shades TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    psm.product_id,
    psm.match_score,
    psm.match_reasons,
    psm.recommended_shades
  FROM public.product_skin_matches psm
  JOIN public.products p ON psm.product_id = p.id
  WHERE psm.user_id = p_user_id
  AND p.status = 'active'
  ORDER BY psm.match_score DESC, psm.calculated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_skin_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_skin_profiles_updated_at 
  BEFORE UPDATE ON public.user_skin_profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_skin_profile_updated_at();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_skin_profiles TO authenticated;
GRANT SELECT ON public.product_shades TO anon, authenticated;
GRANT ALL ON public.product_shades TO authenticated;
GRANT ALL ON public.product_skin_matches TO authenticated;
GRANT ALL ON public.skin_analysis_logs TO authenticated;

-- Enable real-time for skin profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_skin_profiles;
