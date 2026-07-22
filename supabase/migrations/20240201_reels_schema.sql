-- Advanced Reels Schema for Mithas Glow
-- PostgreSQL + pgVector for AI Recommendations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (enhanced)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  is_artist BOOLEAN DEFAULT FALSE,
  wallet_balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reels table
CREATE TABLE IF NOT EXISTS reels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  caption TEXT,
  video_id TEXT, -- Storage reference
  video_url TEXT,
  thumbnail_url TEXT,
  audio_title TEXT,
  audio_artist TEXT,
  duration INTEGER, -- seconds
  width INTEGER,
  height INTEGER,
  file_size BIGINT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'processing', 'flagged')),
  has_ar BOOLEAN DEFAULT FALSE,
  ar_filters JSONB, -- Store AR filter data
  ai_tags TEXT[], -- AI-generated tags
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  ai_embedding VECTOR(1536), -- For similarity search
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  color TEXT,
  size TEXT,
  material TEXT,
  image_url TEXT,
  images JSONB, -- Array of image URLs
  vendor_id UUID REFERENCES profiles(id),
  in_stock BOOLEAN DEFAULT TRUE,
  stock_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  ai_embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reel-Product relationships
CREATE TABLE IF NOT EXISTS reel_products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  timestamp_start INTEGER, -- When product appears in video (seconds)
  timestamp_end INTEGER,
  confidence_score DECIMAL(3,2), -- AI detection confidence
  position_x INTEGER, -- X coordinate of product in frame
  position_y INTEGER, -- Y coordinate
  is_exact_match BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product alternatives (cheaper options)
CREATE TABLE IF NOT EXISTS product_alternatives (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  original_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  alternative_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES profiles(id),
  distance DECIMAL(8,2), -- Distance in km
  similarity_score DECIMAL(3,2),
  price_difference DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reel likes
CREATE TABLE IF NOT EXISTS reel_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

-- Reel comments
CREATE TABLE IF NOT EXISTS reel_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  reply_to_id UUID REFERENCES reel_comments(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Followers/Following
CREATE TABLE IF NOT EXISTS followers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- User vault (saved items)
CREATE TABLE IF NOT EXISTS user_vault (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('reel', 'product')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, reel_id, product_id, type)
);

-- User interactions for AI training
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
  interaction_type TEXT CHECK (interaction_type IN ('view', 'like', 'comment', 'share', 'save', 'ar_try_on')),
  duration INTEGER, -- How long they watched
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- AI model training data
CREATE TABLE IF NOT EXISTS ai_training_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reel_id UUID REFERENCES reels(id) ON DELETE CASCADE,
  features JSONB,
  label TEXT,
  confidence DECIMAL(3,2),
  model_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reels_creator_id ON reels(creator_id);
CREATE INDEX IF NOT EXISTS idx_reels_status ON reels(status);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_ai_embedding ON reels USING ivfflat (ai_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_ai_embedding ON products USING ivfflat (ai_embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_reel_products_reel_id ON reel_products(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_products_product_id ON reel_products(product_id);

CREATE INDEX IF NOT EXISTS idx_reel_likes_reel_id ON reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_likes_user_id ON reel_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_reel_comments_reel_id ON reel_comments(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_comments_user_id ON reel_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following_id ON followers(following_id);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_reel_id ON user_interactions(reel_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interactions(timestamp DESC);

-- RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_alternatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reel_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_training_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Reels
CREATE POLICY "Published reels are viewable by everyone" ON reels FOR SELECT USING (status = 'published');
CREATE POLICY "Users can view own reels" ON reels FOR SELECT USING (creator_id = auth.uid());
CREATE POLICY "Creators can insert own reels" ON reels FOR INSERT WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators can update own reels" ON reels FOR UPDATE USING (creator_id = auth.uid());

-- Products
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);
CREATE POLICY "Vendors can manage own products" ON products FOR ALL USING (vendor_id = auth.uid());

-- Reel interactions
CREATE POLICY "Users can manage reel likes" ON reel_likes FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage comments" ON reel_comments FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage following" ON followers FOR ALL USING (follower_id = auth.uid());
CREATE POLICY "Users can manage vault" ON user_vault FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage interactions" ON user_interactions FOR ALL USING (user_id = auth.uid());

-- Functions for AI recommendations
CREATE OR REPLACE FUNCTION get_personalized_reels(p_user_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  creator_id UUID,
  caption TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  audio_title TEXT,
  has_ar BOOLEAN,
  likes_count INTEGER,
  comments_count INTEGER,
  creator_username TEXT,
  creator_avatar_url TEXT,
  similarity_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH user_vector AS (
    SELECT ai_embedding 
    FROM reels 
    WHERE creator_id = p_user_id 
    LIMIT 1
  ),
  similar_reels AS (
    SELECT 
      r.*,
      p.username as creator_username,
      p.avatar_url as creator_avatar_url,
      1 - (r.ai_embedding <=> (SELECT ai_embedding FROM user_vector)) as similarity
    FROM reels r
    JOIN profiles p ON r.creator_id = p.id
    WHERE r.status = 'published'
    AND r.creator_id != p_user_id
    AND r.ai_embedding IS NOT NULL
    AND (SELECT ai_embedding FROM user_vector) IS NOT NULL
    ORDER BY similarity DESC
    LIMIT p_limit * 3 -- Get more to filter out already viewed
  ),
  filtered_reels AS (
    SELECT sr.*
    FROM similar_reels sr
    WHERE sr.id NOT IN (
      SELECT DISTINCT reel_id 
      FROM user_interactions 
      WHERE user_id = p_user_id 
      AND interaction_type = 'view'
      ORDER BY timestamp DESC
      LIMIT 50
    )
    LIMIT p_limit
  )
  SELECT 
    fr.id,
    fr.creator_id,
    fr.caption,
    fr.video_url,
    fr.thumbnail_url,
    fr.audio_title,
    fr.has_ar,
    fr.likes_count,
    fr.comments_count,
    fr.creator_username,
    fr.creator_avatar_url,
    fr.similarity_score
  FROM filtered_reels fr
  ORDER BY fr.similarity_score DESC, fr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update reel counts
CREATE OR REPLACE FUNCTION update_reel_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET 
      likes_count = likes_count + 1
    WHERE id = NEW.reel_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET 
      likes_count = likes_count - 1
    WHERE id = OLD.reel_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_reel_likes_count
  AFTER INSERT OR DELETE ON reel_likes
  FOR EACH ROW EXECUTE FUNCTION update_reel_counts();

CREATE TRIGGER update_reel_comments_count
  AFTER INSERT OR DELETE ON reel_comments
  FOR EACH ROW EXECUTE FUNCTION update_reel_counts();

-- Function to update profile counts
CREATE OR REPLACE FUNCTION update_profile_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET 
      followers_count = followers_count + 1
    WHERE id = NEW.following_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET 
      followers_count = followers_count - 1
    WHERE id = OLD.following_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_followers_count
  AFTER INSERT OR DELETE ON followers
  FOR EACH ROW EXECUTE FUNCTION update_profile_counts();

-- Updated timestamp triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reels_updated_at
  BEFORE UPDATE ON reels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reel_comments_updated_at
  BEFORE UPDATE ON reel_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
