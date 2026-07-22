-- Supabase Database Functions
-- These functions will be created in your Supabase database

-- Function to increment engagement counts
CREATE OR REPLACE FUNCTION increment_count(item_id UUID, count_field TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE feed_items SET %s = %s + 1 WHERE id = $1', count_field, count_field)
    USING item_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby feed items with location filtering
CREATE OR REPLACE FUNCTION get_nearby_feed_items(
    user_lat DECIMAL,
    user_lng DECIMAL,
    radius_km INTEGER DEFAULT 50,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content_type TEXT,
    title TEXT,
    description TEXT,
    media_url TEXT,
    thumbnail_url TEXT,
    metadata JSONB,
    tags TEXT[],
    location_lat DECIMAL,
    location_lng DECIMAL,
    city TEXT,
    views_count INTEGER,
    likes_count INTEGER,
    saves_count INTEGER,
    shares_count INTEGER,
    is_public BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    distance_km DECIMAL,
    profile_username TEXT,
    profile_avatar_url TEXT,
    profile_is_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fi.id,
        fi.user_id,
        fi.content_type,
        fi.title,
        fi.description,
        fi.media_url,
        fi.thumbnail_url,
        fi.metadata,
        fi.tags,
        fi.location_lat,
        fi.location_lng,
        fi.city,
        fi.views_count,
        fi.likes_count,
        fi.saves_count,
        fi.shares_count,
        fi.is_public,
        fi.created_at,
        fi.updated_at,
        -- Calculate distance using PostGIS
        ROUND(
            ST_Distance(
                ST_Point(fi.location_lng, fi.location_lat)::geography,
                ST_Point(user_lng, user_lat)::geography
            ) / 1000, 2
        ) as distance_km,
        up.username as profile_username,
        up.avatar_url as profile_avatar_url,
        up.is_verified as profile_is_verified
    FROM feed_items fi
    LEFT JOIN user_profiles up ON fi.user_id = up.user_id
    WHERE fi.is_public = true
      AND fi.location_lat IS NOT NULL
      AND fi.location_lng IS NOT NULL
      AND ST_DWithin(
          ST_Point(fi.location_lng, fi.location_lat)::geography,
          ST_Point(user_lng, user_lat)::geography,
          radius_km * 1000
      )
    ORDER BY distance_km ASC, fi.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function for vector similarity search (requires pgvector)
CREATE OR REPLACE FUNCTION find_similar_items(
    query_vector vector(1536),
    similarity_threshold DECIMAL DEFAULT 0.7,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    content_type TEXT,
    title TEXT,
    description TEXT,
    similarity_score DECIMAL,
    profile_username TEXT,
    profile_avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        fi.id,
        fi.user_id,
        fi.content_type,
        fi.title,
        fi.description,
        1 - (fi.embedding <=> query_vector) as similarity_score,
        up.username as profile_username,
        up.avatar_url as profile_avatar_url
    FROM feed_items fi
    LEFT JOIN user_profiles up ON fi.user_id = up.user_id
    WHERE fi.embedding IS NOT NULL
      AND 1 - (fi.embedding <=> query_vector) > similarity_threshold
      AND fi.is_public = true
    ORDER BY similarity_score DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update trending tags
CREATE OR REPLACE FUNCTION update_trending_tags()
RETURNS VOID AS $$
BEGIN
    -- Update trending status based on usage count and growth rate
    UPDATE trending_tags 
    SET is_trending = true,
        last_updated = NOW()
    WHERE usage_count > 100 
      AND growth_rate > 0.1;
    
    -- Remove trending status from low-performing tags
    UPDATE trending_tags 
    SET is_trending = false
    WHERE usage_count < 50 
      OR growth_rate < 0.05;
END;
$$ LANGUAGE plpgsql;

-- Function to get personalized recommendations
CREATE OR REPLACE FUNCTION get_personalized_recommendations(
    user_id UUID,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    content_type TEXT,
    title TEXT,
    description TEXT,
    recommendation_score DECIMAL,
    profile_username TEXT,
    profile_is_verified BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH user_interactions AS (
        SELECT 
            fi.content_type,
            COUNT(*) as interaction_count
        FROM engagement_metrics em
        JOIN feed_items fi ON em.item_id = fi.id
        WHERE em.user_id = user_id
          AND em.interaction_type IN ('like', 'save')
        GROUP BY fi.content_type
    ),
    user_preferences AS (
        SELECT 
            up.preferences
        FROM user_profiles up
        WHERE up.user_id = user_id
    )
    SELECT 
        fi.id,
        fi.content_type,
        fi.title,
        fi.description,
        -- Calculate recommendation score based on user interactions and preferences
        COALESCE(ui.interaction_count, 0) * 0.6 + 
        CASE 
            WHEN fi.content_type = (SELECT content_type FROM user_interactions ORDER BY interaction_count DESC LIMIT 1) THEN 0.4
            ELSE 0.2
        END as recommendation_score,
        up.username as profile_username,
        up.is_verified as profile_is_verified
    FROM feed_items fi
    LEFT JOIN user_profiles up ON fi.user_id = up.user_id
    LEFT JOIN user_interactions ui ON fi.content_type = ui.content_type
    WHERE fi.is_public = true
      AND fi.user_id != user_id
      AND fi.created_at > NOW() - INTERVAL '30 days'
    ORDER BY recommendation_score DESC, fi.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update trending tags
CREATE OR REPLACE FUNCTION auto_update_trending_tags()
RETURNS TRIGGER AS $$
BEGIN
    -- Update trending tags when engagement metrics change
    PERFORM update_trending_tags();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update trending tags periodically
CREATE TRIGGER trigger_update_trending_tags
    AFTER INSERT OR UPDATE ON engagement_metrics
    FOR EACH STATEMENT
    EXECUTE FUNCTION auto_update_trending_tags();
