-- ============================================================================
-- MITHAS GLOW — PHASE 2.8 DATABASE & RLS FIX SCRIPT
-- Run this script in your Supabase SQL Editor to grant customer read access
-- and mark artist profiles as verified so they load correctly on the app.
-- ============================================================================

-- 1. Ensure columns exist on profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_seller boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_status text DEFAULT 'verified',
ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'personal',
ADD COLUMN IF NOT EXISTS industry text DEFAULT 'makeup_artist',
ADD COLUMN IF NOT EXISTS shop_name text,
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Update all existing seller profiles to be verified and active
UPDATE profiles 
SET 
  is_seller = true,
  seller_status = 'verified',
  account_type = 'professional',
  industry = COALESCE(industry, 'makeup_artist'),
  is_active = true
WHERE 
  is_seller = true 
  OR account_type = 'professional' 
  OR role = 'seller'
  OR seller_status = 'verified';

-- 3. Enable Row Level Security (RLS) and grant PUBLIC READ access on tables

-- A) PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public read access on profiles" ON profiles;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);

-- B) SHOPS
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read shops" ON shops;
CREATE POLICY "Public read shops" ON shops FOR SELECT USING (true);

-- C) SELLERS
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read sellers" ON sellers;
CREATE POLICY "Public read sellers" ON sellers FOR SELECT USING (true);

-- D) ARTIST SERVICES
ALTER TABLE artist_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read artist_services" ON artist_services;
CREATE POLICY "Public read artist_services" ON artist_services FOR SELECT USING (true);

-- E) ARTIST PORTFOLIO
ALTER TABLE artist_portfolio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read artist_portfolio" ON artist_portfolio;
CREATE POLICY "Public read artist_portfolio" ON artist_portfolio FOR SELECT USING (true);

-- F) REVIEWS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read reviews" ON reviews;
CREATE POLICY "Public read reviews" ON reviews FOR SELECT USING (true);

-- 4. Grant explicit table SELECT permissions to anon and authenticated roles
GRANT SELECT ON profiles TO anon, authenticated;
GRANT SELECT ON shops TO anon, authenticated;
GRANT SELECT ON sellers TO anon, authenticated;
GRANT SELECT ON artist_services TO anon, authenticated;
GRANT SELECT ON artist_portfolio TO anon, authenticated;
GRANT SELECT ON reviews TO anon, authenticated;

-- 5. Verification Query: Inspect verified artists and their content count
SELECT 
  p.id AS artist_id,
  p.full_name,
  p.shop_name,
  p.avatar_url,
  p.seller_status,
  p.is_active,
  (SELECT COUNT(*) FROM artist_services s WHERE s.artist_id = p.id) AS service_count,
  (SELECT COUNT(*) FROM artist_portfolio port WHERE port.artist_id = p.id) AS portfolio_count,
  (SELECT COUNT(*) FROM reviews r WHERE r.artist_id = p.id) AS review_count
FROM profiles p
WHERE p.is_seller = true OR p.account_type = 'professional' OR p.role = 'seller';
