-- Glow Journey Schema for IONTIX
-- Table: user_analyses
-- Purpose: Store user skin analysis results with consent-based data handling

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_analyses table
CREATE TABLE IF NOT EXISTS user_analyses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Image storage (nullable for privacy-first users)
    image_url TEXT,
    
    -- Analysis metrics (128-metric engine results)
    metrics JSONB NOT NULL,
    
    -- Analysis summary
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    skin_type TEXT NOT NULL CHECK (skin_type IN ('dry', 'oily', 'combination', 'normal', 'sensitive')),
    
    -- Glow Journey consent flag
    is_glow_journey BOOLEAN NOT NULL DEFAULT false,
    
    -- Additional metadata
    session_id TEXT,
    device_info JSONB,
    analysis_duration_ms INTEGER
);

-- Create indexes for performance
CREATE INDEX idx_user_analyses_user_id ON user_analyses(user_id);
CREATE INDEX idx_user_analyses_created_at ON user_analyses(created_at DESC);
CREATE INDEX idx_user_analyses_is_glow_journey ON user_analyses(is_glow_journey);
CREATE INDEX idx_user_analyses_overall_score ON user_analyses(overall_score);

-- Create GIN index for JSONB metrics
CREATE INDEX idx_user_analyses_metrics ON user_analyses USING GIN(metrics);

-- Enable Row Level Security
ALTER TABLE user_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own analyses
CREATE POLICY "Users can view own analyses" ON user_analyses
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own analyses
CREATE POLICY "Users can insert own analyses" ON user_analyses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own analyses (if needed in future)
CREATE POLICY "Users can update own analyses" ON user_analyses
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own analyses (GDPR compliance)
CREATE POLICY "Users can delete own analyses" ON user_analyses
    FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for skin scan images (if not already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'skin-scans', 
    'skin-scans', 
    false, 
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS Policy for storage bucket
-- Users can only upload to their own folder
CREATE POLICY "Users can upload to own skin-scans folder" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'skin-scans' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can only view their own images
CREATE POLICY "Users can view own skin-scans" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'skin-scans' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can update their own images
CREATE POLICY "Users can update own skin-scans" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'skin-scans' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Users can delete their own images
CREATE POLICY "Users can delete own skin-scans" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'skin-scans' AND 
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Function to extract folder name from file path
CREATE OR REPLACE FUNCTION storage.foldername(path text)
RETURNS text[]
LANGUAGE sql
AS $$
    SELECT string_to_array(path, '/');
$$;

-- Create trigger for updated_at timestamp (if needed for future updates)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_analyses IS 'Stores user skin analysis results with configurable image storage based on consent preferences';
COMMENT ON COLUMN user_analyses.metrics IS 'JSONB object containing 128-metric engine results including clinical metrics, beauty scores, and detailed analysis';
COMMENT ON COLUMN user_analyses.is_glow_journey IS 'Indicates whether user consented to full Glow Journey with image storage and tracking';
COMMENT ON COLUMN user_analyses.image_url IS 'URL to stored analysis image; NULL for privacy-first users who declined image storage';
