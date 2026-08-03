-- CURRENT DATABASE SCHEMA FOR MITHAS GLOW
-- This schema matches the current code implementation
-- Run this in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean re-creation)
DROP TABLE IF EXISTS profiles CASCADE;

-- Profiles Table (matches current code expectations)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,                    -- ✅ Required by current code
    phone VARCHAR(20),                              -- ✅ Used by current code
    full_name VARCHAR(100),                         -- ✅ Required by current code
    display_name VARCHAR(100),                      -- ✅ Used by current code
    avatar_url TEXT,                                -- ✅ Used by current code
    username VARCHAR(50) UNIQUE,                    -- ✅ Used by current code
    bio TEXT,                                       -- ✅ Used by current code
    city VARCHAR(100),                              -- ✅ Used by current code
    dob DATE,                                       -- ✅ Used by current code
    date_of_birth DATE,                             -- ✅ Used by current code
    account_type VARCHAR(20) DEFAULT 'personal',    -- ✅ Used by current code
    industry VARCHAR(50),                           -- ✅ Used by current code
    portfolio_link TEXT,                            -- ✅ Used by current code
    experience VARCHAR(50),                          -- ✅ Used by current code
    operating_hours TEXT,                            -- ✅ Used by current code
    profile_completed BOOLEAN DEFAULT FALSE,         -- ✅ Used by current code
    is_seller BOOLEAN DEFAULT FALSE,                -- ✅ Used by current code
    seller_status VARCHAR(20),                      -- ✅ Used by current code
    shop_name VARCHAR(100),                         -- ✅ Used by current code
    shop_type VARCHAR(50),                          -- ✅ Used by current code
    gender VARCHAR(10) CHECK (gender IN ('female', 'male', 'other')), -- ✅ Used by current code
    role VARCHAR(20) DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')), -- ✅ Used by current code
    preferred_language VARCHAR(10) DEFAULT 'en',     -- ✅ Used by current code
    theme VARCHAR(20) DEFAULT 'light',              -- ✅ Used by current code
    notifications_enabled BOOLEAN DEFAULT TRUE,      -- ✅ Used by current code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,         -- ✅ Used by current code
    is_active BOOLEAN DEFAULT TRUE                  -- ✅ Used by current code
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_is_seller ON profiles(is_seller);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Insert sample data for testing
INSERT INTO profiles (id, email, username, full_name, display_name, account_type, profile_completed, role, preferred_language, theme, notifications_enabled, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'test1@example.com', 'testuser1', 'Test User One', 'Test User 1', 'personal', true, 'buyer', 'en', 'light', true, true),
('550e8400-e29b-41d4-a716-446655440002', 'test2@example.com', 'testuser2', 'Test User Two', 'Test User 2', 'business', true, 'seller', 'en', 'light', true, true),
('550e8400-e29b-41d4-a716-446655440003', 'test3@example.com', 'testuser3', 'Test User Three', 'Test User 3', 'personal', true, 'buyer', 'en', 'light', true, true)
ON CONFLICT (id) DO NOTHING;

-- Verify table was created correctly
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
