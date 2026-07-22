-- Update profiles table to match our application requirements
-- Run this in your Supabase SQL editor

-- First, let's add the missing columns to the existing profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS username text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS dob text,
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'personal',
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS portfolio_link text,
ADD COLUMN IF NOT EXISTS experience text,
ADD COLUMN IF NOT EXISTS operating_hours text,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_seller boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_status text,
ADD COLUMN IF NOT EXISTS shop_name text,
ADD COLUMN IF NOT EXISTS shop_type text,
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at on profile changes
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for the profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for the profiles table
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS profiles_display_name_idx ON profiles(display_name);
CREATE INDEX IF NOT EXISTS profiles_shop_name_idx ON profiles(shop_name);
CREATE INDEX IF NOT EXISTS profiles_is_seller_idx ON profiles(is_seller);
