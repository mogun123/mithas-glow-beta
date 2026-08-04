-- Location-Based Discovery System for MITHAS GLOW
-- Add to existing supabase schema

-- User locations table
CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  postal_code TEXT,
  accuracy_radius INTEGER, -- in meters
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Artist/service provider locations
CREATE TABLE IF NOT EXISTS public.artist_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  artist_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  is_home_service BOOLEAN DEFAULT FALSE,
  service_radius INTEGER DEFAULT 10, -- km
  operating_hours JSONB DEFAULT '{}', -- JSON object with day-wise hours
  specialties TEXT[] DEFAULT '{}',
  price_range TEXT,
  verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store locations
CREATE TABLE IF NOT EXISTS public.store_locations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_type TEXT CHECK (store_type IN ('retail', 'salon', 'studio', 'boutique')) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  categories TEXT[] DEFAULT '{}',
  brands TEXT[] DEFAULT '{}',
  operating_hours JSONB DEFAULT '{}',
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location search cache for performance
CREATE TABLE IF NOT EXISTS public.location_search_cache (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  search_lat DECIMAL(10, 8) NOT NULL,
  search_lng DECIMAL(11, 8) NOT NULL,
  search_radius INTEGER NOT NULL, -- km
  search_type TEXT CHECK (search_type IN ('artists', 'stores', 'both')) NOT NULL,
  results JSONB NOT NULL, -- Cached search results
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '1 hour'
);

-- Location-based interactions (views, bookings, etc.)
CREATE TABLE IF NOT EXISTS public.location_interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL, -- artist_id or store_id
  target_type TEXT CHECK (target_type IN ('artist', 'store')) NOT NULL,
  interaction_type TEXT CHECK (interaction_type IN ('view', 'call', 'email', 'directions', 'book', 'visit')) NOT NULL,
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8),
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_locations_user ON public.user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_coords ON public.user_locations USING GIST(point(longitude, latitude));
CREATE INDEX IF NOT EXISTS idx_user_locations_updated ON public.user_locations(updated_at);

CREATE INDEX IF NOT EXISTS idx_artist_locations_artist ON public.artist_locations(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_locations_coords ON public.artist_locations USING GIST(point(longitude, latitude));
CREATE INDEX IF NOT EXISTS idx_artist_locations_city ON public.artist_locations(city);
CREATE INDEX IF NOT EXISTS idx_artist_locations_specialties ON public.artist_locations USING GIN(specialties);
CREATE INDEX IF NOT EXISTS idx_artist_locations_rating ON public.artist_locations(rating);

CREATE INDEX IF NOT EXISTS idx_store_locations_seller ON public.store_locations(seller_id);
CREATE INDEX IF NOT EXISTS idx_store_locations_coords ON public.store_locations USING GIST(point(longitude, latitude));
CREATE INDEX IF NOT EXISTS idx_store_locations_city ON public.store_locations(city);
CREATE INDEX IF NOT EXISTS idx_store_locations_categories ON public.store_locations USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_store_locations_rating ON public.store_locations(rating);

CREATE INDEX IF NOT EXISTS idx_location_search_cache_user ON public.location_search_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_location_search_cache_expires ON public.location_search_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_location_interactions_user ON public.location_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_location_interactions_target ON public.location_interactions(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_location_interactions_created ON public.location_interactions(created_at);

-- RLS Policies
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_search_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_interactions ENABLE ROW LEVEL SECURITY;

-- User locations policies
CREATE POLICY "Users can view own locations" ON public.user_locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own locations" ON public.user_locations FOR ALL USING (auth.uid() = user_id);

-- Artist locations policies
CREATE POLICY "Artist locations are publicly viewable" ON public.artist_locations FOR SELECT USING (true);
CREATE POLICY "Artists can manage own locations" ON public.artist_locations FOR ALL USING (auth.uid() = artist_id);

-- Store locations policies
CREATE POLICY "Store locations are publicly viewable" ON public.store_locations FOR SELECT USING (true);
CREATE POLICY "Sellers can manage own store locations" ON public.store_locations FOR ALL USING (auth.uid() = seller_id);

-- Location search cache policies
CREATE POLICY "Users can view own search cache" ON public.location_search_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own search cache" ON public.location_search_cache FOR ALL USING (auth.uid() = user_id);

-- Location interactions policies
CREATE POLICY "Users can view own interactions" ON public.location_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own interactions" ON public.location_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DECIMAL, 
  lng1 DECIMAL, 
  lat2 DECIMAL, 
  lng2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  earth_radius DECIMAL := 6371; -- Earth's radius in kilometers
  dlat DECIMAL;
  dlng DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := RADIANS(lat2 - lat1);
  dlng := RADIANS(lng2 - lng1);
  a := SIN(dlat/2) * SIN(dlat/2) + 
      COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * 
      SIN(dlng/2) * SIN(dlng/2);
  c := 2 * ATAN2(SQRT(a), SQRT(1 - a));
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find nearby artists
CREATE OR REPLACE FUNCTION public.find_nearby_artists(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_radius_km INTEGER DEFAULT 5,
  p_limit INTEGER DEFAULT 20,
  p_specialties TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  artist_id UUID,
  business_name TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  address TEXT,
  city TEXT,
  phone TEXT,
  specialties TEXT[],
  price_range TEXT,
  rating DECIMAL,
  review_count INTEGER,
  distance_km DECIMAL,
  verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.artist_id,
    al.business_name,
    al.latitude,
    al.longitude,
    al.address,
    al.city,
    al.phone,
    al.specialties,
    al.price_range,
    al.rating,
    al.review_count,
    public.calculate_distance(p_lat, p_lng, al.latitude, al.longitude) as distance_km,
    al.verified
  FROM public.artist_locations al
  WHERE public.calculate_distance(p_lat, p_lng, al.latitude, al.longitude) <= p_radius_km
    AND (p_specialties IS NULL OR al.specialties && p_specialties)
  ORDER BY distance_km ASC, al.rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find nearby stores
CREATE OR REPLACE FUNCTION public.find_nearby_stores(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_radius_km INTEGER DEFAULT 5,
  p_limit INTEGER DEFAULT 20,
  p_categories TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  store_id UUID,
  store_name TEXT,
  store_type TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  address TEXT,
  city TEXT,
  phone TEXT,
  categories TEXT[],
  brands TEXT[],
  rating DECIMAL,
  review_count INTEGER,
  distance_km DECIMAL,
  verified BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.store_id,
    sl.store_name,
    sl.store_type,
    sl.latitude,
    sl.longitude,
    sl.address,
    sl.city,
    sl.phone,
    sl.categories,
    sl.brands,
    sl.rating,
    sl.review_count,
    public.calculate_distance(p_lat, p_lng, sl.latitude, sl.longitude) as distance_km,
    sl.verified
  FROM public.store_locations sl
  WHERE public.calculate_distance(p_lat, p_lng, sl.latitude, sl.longitude) <= p_radius_km
    AND (p_categories IS NULL OR sl.categories && p_categories)
  ORDER BY distance_km ASC, sl.rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log location interaction
CREATE OR REPLACE FUNCTION public.log_location_interaction(
  p_user_id UUID,
  p_target_id UUID,
  p_target_type TEXT,
  p_interaction_type TEXT,
  p_user_lat DECIMAL DEFAULT NULL,
  p_user_lng DECIMAL DEFAULT NULL,
  p_context JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.location_interactions (
    user_id, target_id, target_type, interaction_type, 
    user_lat, user_lng, context
  ) VALUES (
    p_user_id, p_target_id, p_target_type, p_interaction_type,
    p_user_lat, p_user_lng, p_context
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user location
CREATE OR REPLACE FUNCTION public.update_user_location(
  p_user_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_accuracy_radius INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO public.user_locations (
    user_id, latitude, longitude, address, city, state, 
    postal_code, accuracy_radius
  ) VALUES (
    p_user_id, p_latitude, p_longitude, p_address, p_city, p_state,
    p_postal_code, p_accuracy_radius
  )
  ON CONFLICT (user_id) DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    postal_code = EXCLUDED.postal_code,
    accuracy_radius = EXCLUDED.accuracy_radius,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to update timestamps
CREATE OR REPLACE FUNCTION public.update_location_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_locations_updated_at 
  BEFORE UPDATE ON public.user_locations 
  FOR EACH ROW EXECUTE FUNCTION public.update_location_timestamps();

CREATE TRIGGER update_artist_locations_updated_at 
  BEFORE UPDATE ON public.artist_locations 
  FOR EACH ROW EXECUTE FUNCTION public.update_location_timestamps();

CREATE TRIGGER update_store_locations_updated_at 
  BEFORE UPDATE ON public.store_locations 
  FOR EACH ROW EXECUTE FUNCTION public.update_location_timestamps();

-- Function to clean up expired search cache
CREATE OR REPLACE FUNCTION public.cleanup_search_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.location_search_cache 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_locations TO authenticated;
GRANT SELECT ON public.artist_locations TO anon, authenticated;
GRANT ALL ON public.artist_locations TO authenticated;
GRANT SELECT ON public.store_locations TO anon, authenticated;
GRANT ALL ON public.store_locations TO authenticated;
GRANT ALL ON public.location_search_cache TO authenticated;
GRANT ALL ON public.location_interactions TO authenticated;

-- Enable real-time for location tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.artist_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.store_locations;
