-- Migration: Add rewards fields to profiles table
-- This migration adds the necessary columns for the glow points and streak system

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS glow_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_scan_date DATE;

-- Add index for performance on last_scan_date queries
CREATE INDEX IF NOT EXISTS idx_profiles_last_scan_date ON profiles(last_scan_date);
