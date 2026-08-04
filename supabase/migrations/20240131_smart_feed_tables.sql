-- MITHAS GLOW Smart Feed System Tables
-- Created: January 31, 2026
-- Purpose: Next-Gen Home Screen Intelligence

-- 1. User Interactions Table
-- Tracks all user interactions with content for AI learning
CREATE TABLE IF NOT EXISTS user_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('reel', 'product', 'look', 'tutorial', 'event')),
    interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'like', 'save', 'share', 'purchase', 'try_on', 'book')),
    duration_seconds INTEGER,
    context JSONB DEFAULT '{}',
    feed_position INTEGER,
    relevance_score DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_user_interactions_user_id (user_id),
    INDEX idx_user_interactions_item_id (item_id),
    INDEX idx_user_interactions_type (item_type, interaction_type),
    INDEX idx_user_interactions_created_at (created_at)
);

-- 2. User Preferences Table
-- Stores user preferences and style profile
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Style Preferences
    style_categories TEXT[] DEFAULT '{}',
    favorite_colors TEXT[] DEFAULT '{}',
    preferred_occasions TEXT[] DEFAULT '{}',
    preferred_brands TEXT[] DEFAULT '{}',
    
    -- Physical Attributes
    skin_tone TEXT,
    body_type TEXT,
    body_measurements JSONB DEFAULT '{}',
    
    -- Behavioral Preferences
    price_sensitivity TEXT DEFAULT 'moderate' CHECK (price_sensitivity IN ('budget', 'moderate', 'premium')),
    preferred_price_range NUMRANGE,
    size_preferences JSONB DEFAULT '{}',
    
    -- Location Preferences
    preferred_distance_km INTEGER DEFAULT 25,
    preferred_cities TEXT[] DEFAULT '{}',
    
    -- Content Preferences
    followed_creators UUID[] DEFAULT '{}',
    blocked_creators UUID[] DEFAULT '{}',
    preferred_content_types TEXT[] DEFAULT '{}',
    
    -- AI Learning Data
    interaction_weights JSONB DEFAULT '{}',
    preference_vector JSONB DEFAULT '{}',
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Trending Content Table
-- Tracks trending content across different geographic scopes
CREATE TABLE IF NOT EXISTS trending_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('reel', 'product', 'look', 'tutorial', 'event')),
    
    -- Trending Metrics
    trend_score DECIMAL(8,3) NOT NULL,
    velocity_score DECIMAL(8,3) DEFAULT 0, -- Rate of increase
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Geographic Scope
    geographic_scope TEXT NOT NULL CHECK (geographic_scope IN ('city', 'state', 'national', 'global')),
    location TEXT NOT NULL,
    city TEXT,
    state TEXT,
    country TEXT DEFAULT 'India',
    
    -- Categorization
    category TEXT NOT NULL,
    subcategory TEXT,
    tags TEXT[] DEFAULT '{}',
    
    -- Time-based
    trend_duration_hours INTEGER DEFAULT 24,
    peak_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    
    -- Indexes
    INDEX idx_trending_content_score (trend_score DESC),
    INDEX idx_trending_content_location (geographic_scope, location),
    INDEX idx_trending_content_category (category),
    INDEX idx_trending_content_expires (expires_at)
);

-- 4. Feed Impressions Table
-- Tracks feed impressions for analytics and optimization
CREATE TABLE IF NOT EXISTS feed_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    item_id UUID NOT NULL,
    item_type TEXT NOT NULL,
    
    -- Feed Context
    feed_position INTEGER NOT NULL,
    feed_type TEXT NOT NULL CHECK (feed_type IN ('for_you', 'following', 'nearby', 'events', 'search')),
    session_id UUID,
    
    -- Interaction Data
    was_clicked BOOLEAN DEFAULT FALSE,
    time_viewed_seconds INTEGER DEFAULT 0,
    scroll_percentage INTEGER DEFAULT 0,
    
    -- AI Context
    relevance_score DECIMAL(5,2),
    algorithm_version TEXT DEFAULT '1.0',
    context_signals JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_feed_impressions_user_id (user_id),
    INDEX idx_feed_impressions_item_id (item_id),
    INDEX idx_feed_impressions_session (session_id),
    INDEX idx_feed_impressions_created_at (created_at)
);

-- 5. Content Table (Enhanced)
-- Central content repository for all feed items
CREATE TABLE IF NOT EXISTS content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('reel', 'product', 'look', 'tutorial', 'event')),
    
    -- Media
    image_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    media_urls TEXT[] DEFAULT '{}',
    
    -- Tags and Categorization
    category TEXT NOT NULL,
    subcategory TEXT,
    tags TEXT[] DEFAULT '{}',
    occasions TEXT[] DEFAULT '{}',
    seasons TEXT[] DEFAULT '{}',
    
    -- Target Audience
    target_gender TEXT CHECK (target_gender IN ('male', 'female', 'all')),
    target_age_range NUMRANGE,
    target_skin_tones TEXT[] DEFAULT '{}',
    target_body_types TEXT[] DEFAULT '{}',
    
    -- Business Info
    price_range NUMRANGE,
    is_free BOOLEAN DEFAULT FALSE,
    currency TEXT DEFAULT 'INR',
    
    -- Location
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    city TEXT,
    state TEXT,
    is_virtual BOOLEAN DEFAULT FALSE,
    
    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    available_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    available_until TIMESTAMP WITH TIME ZONE,
    
    -- Quality Metrics
    quality_score DECIMAL(3,2) DEFAULT 0.5 CHECK (quality_score >= 0 AND quality_score <= 1),
    ai_confidence DECIMAL(3,2) DEFAULT 0.5,
    moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    
    -- Engagement Metrics
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    conversion_count INTEGER DEFAULT 0,
    
    -- Product/Service Specific
    products JSONB DEFAULT '[]', -- Array of product references
    services JSONB DEFAULT '[]', -- Array of service references
    booking_url TEXT,
    purchase_url TEXT,
    
    -- AR/VR Features
    ar_enabled BOOLEAN DEFAULT FALSE,
    vr_enabled BOOLEAN DEFAULT FALSE,
    try_on_enabled BOOLEAN DEFAULT FALSE,
    
    -- Urgency Signals
    urgency_type TEXT CHECK (urgency_type IN ('limited_stock', 'flash_sale', 'ending_soon', 'new_arrival')),
    urgency_message TEXT,
    urgency_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_content_creator_id (creator_id),
    INDEX idx_content_type (type),
    INDEX idx_content_category (category),
    INDEX idx_content_location (location_lat, location_lng),
    INDEX idx_content_active (is_active),
    INDEX idx_content_created_at (created_at),
    INDEX idx_content_trending (views_count, likes_count, created_at)
);

-- 6. User Follows Table
-- Tracks user following relationships
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Follow Context
    follow_type TEXT DEFAULT 'creator' CHECK (follow_type IN ('creator', 'brand', 'friend')),
    follow_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(follower_id, following_id),
    
    -- Indexes
    INDEX idx_user_follows_follower (follower_id),
    INDEX idx_user_follows_following (following_id)
);

-- 7. Smart Feed Cache Table
-- Caches generated feeds for performance
CREATE TABLE IF NOT EXISTS smart_feed_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Cache Context
    feed_type TEXT NOT NULL,
    context_hash TEXT NOT NULL, -- Hash of context parameters
    
    -- Cached Data
    feed_data JSONB NOT NULL,
    item_ids UUID[] NOT NULL,
    
    -- Cache Metadata
    algorithm_version TEXT DEFAULT '1.0',
    cache_score DECIMAL(5,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 minutes'),
    
    -- Unique constraint
    UNIQUE(user_id, feed_type, context_hash),
    
    -- Indexes
    INDEX idx_smart_feed_cache_user (user_id),
    INDEX idx_smart_feed_cache_expires (expires_at)
);

-- 8. Content Analytics Table
-- Detailed analytics for content performance
CREATE TABLE IF NOT EXISTS content_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    
    -- Time Window
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),
    
    -- Engagement Metrics
    views INTEGER DEFAULT 0,
    unique_views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    
    -- Conversion Metrics
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    
    -- Geographic Distribution
    geographic_data JSONB DEFAULT '{}',
    
    -- Demographic Data
    demographic_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(content_id, date, hour),
    
    -- Indexes
    INDEX idx_content_analytics_content_date (content_id, date),
    INDEX idx_content_analytics_date_hour (date, hour)
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_feed_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;

-- User Interactions RLS
CREATE POLICY "Users can view own interactions" ON user_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions" ON user_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Preferences RLS
CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Feed Impressions RLS
CREATE POLICY "Users can view own impressions" ON feed_impressions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own impressions" ON feed_impressions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Content RLS
CREATE POLICY "Anyone can view active content" ON content
    FOR SELECT USING (is_active = true);

CREATE POLICY "Creators can manage own content" ON content
    FOR ALL USING (auth.uid() = creator_id);

-- User Follows RLS
CREATE POLICY "Users can view own follows" ON user_follows
    FOR SELECT USING (auth.uid() = follower_id);

CREATE POLICY "Users can manage own follows" ON user_follows
    FOR ALL USING (auth.uid() = follower_id);

-- Smart Feed Cache RLS
CREATE POLICY "Users can view own cache" ON smart_feed_cache
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cache" ON smart_feed_cache
    FOR ALL USING (auth.uid() = user_id);

-- Functions and Triggers

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate trending score
CREATE OR REPLACE FUNCTION calculate_trending_score(
    content_item_id UUID,
    time_window_hours INTEGER DEFAULT 24
)
RETURNS DECIMAL(8,3) AS $$
DECLARE
    trending_score DECIMAL(8,3);
    recent_views INTEGER;
    recent_likes INTEGER;
    recent_saves INTEGER;
    total_interactions INTEGER;
    recency_bonus DECIMAL(3,2);
BEGIN
    -- Get recent engagement
    SELECT 
        COALESCE(SUM(CASE WHEN interaction_type = 'view' THEN 1 ELSE 0 END), 0) as views,
        COALESCE(SUM(CASE WHEN interaction_type = 'like' THEN 1 ELSE 0 END), 0) as likes,
        COALESCE(SUM(CASE WHEN interaction_type = 'save' THEN 1 ELSE 0 END), 0) as saves
    INTO recent_views, recent_likes, recent_saves
    FROM user_interactions
    WHERE item_id = content_item_id
    AND created_at >= NOW() - INTERVAL '1 hour' * time_window_hours;
    
    -- Calculate total interactions with weights
    total_interactions := recent_views + (recent_likes * 2) + (recent_saves * 3);
    
    -- Calculate recency bonus (newer content gets bonus)
    recency_bonus := CASE 
        WHEN EXISTS(SELECT 1 FROM content WHERE id = content_item_id AND created_at >= NOW() - INTERVAL '6 hours') THEN 1.5
        WHEN EXISTS(SELECT 1 FROM content WHERE id = content_item_id AND created_at >= NOW() - INTERVAL '24 hours') THEN 1.2
        ELSE 1.0
    END;
    
    -- Final trending score
    trending_score := (total_interactions * recency_bonus) / 100.0;
    
    RETURN trending_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update trending content
CREATE OR REPLACE FUNCTION update_trending_content()
RETURNS void AS $$
BEGIN
    -- Insert new trending items
    INSERT INTO trending_content (item_id, item_type, trend_score, geographic_scope, location, category, created_at, expires_at)
    SELECT 
        c.id,
        c.type,
        calculate_trending_score(c.id, 24),
        'national',
        COALESCE(c.city, 'India'),
        c.category,
        NOW(),
        NOW() + INTERVAL '24 hours'
    FROM content c
    WHERE c.is_active = true
    AND c.created_at >= NOW() - INTERVAL '7 days'
    AND calculate_trending_score(c.id, 24) > 1.0
    ON CONFLICT (item_id, geographic_scope, location) DO UPDATE SET
        trend_score = EXCLUDED.trend_score,
        expires_at = EXCLUDED.expires_at;
    
    -- Clean expired trending items
    DELETE FROM trending_content WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job (requires pg_cron extension)
-- SELECT cron.schedule('update-trending-content', '*/10 * * * *', 'SELECT update_trending_content();');

-- Initial Data and Setup

-- Insert default user preferences for existing users
INSERT INTO user_preferences (user_id, style_categories, preferred_occasions, price_sensitivity)
SELECT 
    id,
    ARRAY['casual', 'party', 'office'],
    ARRAY['wedding', 'party', 'festival'],
    'moderate'
FROM profiles
WHERE id NOT IN (SELECT user_id FROM user_preferences)
AND is_active = true;

-- Grant necessary permissions
GRANT SELECT, INSERT ON user_interactions TO authenticated;
GRANT SELECT, INSERT ON user_preferences TO authenticated;
GRANT SELECT ON trending_content TO authenticated, anon;
GRANT SELECT, INSERT ON feed_impressions TO authenticated;
GRANT SELECT ON content TO authenticated, anon;
GRANT SELECT, INSERT ON user_follows TO authenticated;
GRANT SELECT, INSERT, UPDATE ON smart_feed_cache TO authenticated;
GRANT SELECT ON content_analytics TO authenticated, anon;

-- Sequence setup for auto-incrementing IDs if needed
CREATE SEQUENCE IF NOT EXISTS content_id_seq;
CREATE SEQUENCE IF NOT EXISTS user_interactions_id_seq;

COMMIT;
