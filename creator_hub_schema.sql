-- Creator Hub Database Schema
-- This SQL creates the necessary tables for the Creator Hub functionality

-- Create creator_posts table
CREATE TABLE IF NOT EXISTS creator_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    creator_name TEXT NOT NULL,
    creator_avatar TEXT,
    creator_level TEXT DEFAULT 'bronze' CHECK (creator_level IN ('diamond', 'gold', 'silver', 'bronze')),
    image_url TEXT NOT NULL,
    product_id UUID NOT NULL,
    product_name TEXT NOT NULL,
    product_price DECIMAL(10,2) NOT NULL,
    product_image TEXT NOT NULL,
    caption TEXT,
    likes_count INTEGER DEFAULT 0,
    is_live BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_creator_posts_user_id ON creator_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_posts_created_at ON creator_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_posts_likes_count ON creator_posts(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_creator_posts_is_live ON creator_posts(is_live);

-- Enable RLS (Row Level Security)
ALTER TABLE creator_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all creator posts
CREATE POLICY "Public view access to creator_posts" ON creator_posts
    FOR SELECT USING (true);

-- Users can insert their own posts
CREATE POLICY "Users can insert own creator_posts" ON creator_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update own creator_posts" ON creator_posts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own creator_posts" ON creator_posts
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_creator_posts_updated_at 
    BEFORE UPDATE ON creator_posts 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create creator_likes table for tracking likes
CREATE TABLE IF NOT EXISTS creator_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES creator_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Enable RLS for creator_likes
ALTER TABLE creator_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creator_likes
CREATE POLICY "Users can manage their own likes" ON creator_likes
    FOR ALL USING (auth.uid() = user_id);

-- Create function to get posts with like status for current user
CREATE OR REPLACE FUNCTION get_creator_posts_with_like_status(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    creator_name TEXT,
    creator_avatar TEXT,
    creator_level TEXT,
    image_url TEXT,
    product_id UUID,
    product_name TEXT,
    product_price DECIMAL(10,2),
    product_image TEXT,
    caption TEXT,
    likes_count INTEGER,
    is_live BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    is_liked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.*,
        (cl.user_id IS NOT NULL) as is_liked
    FROM creator_posts cp
    LEFT JOIN creator_likes cl ON cp.id = cl.post_id AND (cl.user_id = p_user_id OR p_user_id IS NULL)
    ORDER BY cp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment likes
CREATE OR REPLACE FUNCTION increment_post_likes(p_post_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_like_count INTEGER;
BEGIN
    UPDATE creator_posts 
    SET likes_count = likes_count + 1
    WHERE id = p_post_id
    RETURNING likes_count INTO new_like_count;
    
    RETURN new_like_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to decrement likes
CREATE OR REPLACE FUNCTION decrement_post_likes(p_post_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_like_count INTEGER;
BEGIN
    UPDATE creator_posts 
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = p_post_id
    RETURNING likes_count INTO new_like_count;
    
    RETURN new_like_count;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO creator_posts (user_id, creator_name, creator_avatar, creator_level, image_url, product_id, product_name, product_price, product_image, caption, likes_count, is_live) VALUES
('user_1', 'Luna Style', '👩‍🎤', 'diamond', 'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=800', gen_random_uuid(), 'Neural Jacket', 2999.00, 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=200', 'Rocking the future of fashion with this neural-enhanced jacket! 🔮✨', 2341, false),
('user_2', 'Cyber Chic', '👽', 'gold', 'https://images.unsplash.com/photo-1578632292335-df3abbb0d586?w=800', gen_random_uuid(), 'Holographic Dress', 4599.00, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=200', 'Holographic dreams become reality 💫 Living for this iridescent moment!', 1856, true),
('user_3', 'AI Fashionista', '🧠', 'diamond', 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800', gen_random_uuid(), 'Smart Pants', 1899.00, 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=200', 'AI-powered fashion that adapts to your style! 🤖💎', 3124, false);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON creator_posts TO authenticated;
GRANT SELECT, INSERT, DELETE ON creator_likes TO authenticated;
GRANT EXECUTE ON FUNCTION get_creator_posts_with_like_status TO authenticated;
GRANT EXECUTE ON FUNCTION increment_post_likes TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_post_likes TO authenticated;

-- Create storage bucket for creator images (if using Supabase Storage)
INSERT INTO storage.buckets (id, name, public) VALUES ('creator-images', 'creator-images', true) ON CONFLICT (id) DO NOTHING;

-- Set up storage policies
CREATE POLICY "Creator images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'creator-images');

CREATE POLICY "Creators can upload their own images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'creator-images' AND 
        auth.role() = 'authenticated' AND 
        (auth.uid()::text = (storage.foldername(name))[1])
    );

CREATE POLICY "Creators can update their own images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'creator-images' AND 
        auth.role() = 'authenticated' AND 
        (auth.uid()::text = (storage.foldername(name))[1])
    );

CREATE POLICY "Creators can delete their own images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'creator-images' AND 
        auth.role() = 'authenticated' AND 
        (auth.uid()::text = (storage.foldername(name))[1])
    );
