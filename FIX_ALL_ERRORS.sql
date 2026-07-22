-- =====================================================
-- MITHAS GLOW - COMPLETE DATABASE FIX SCRIPT
-- Fixes all errors: missing columns, foreign keys, tables
-- =====================================================

-- 1. First, enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 2. Update profiles table with ALL missing columns
-- =====================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS profile_image TEXT,
  ADD COLUMN IF NOT EXISTS account_type TEXT,
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS seller_status TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS seller_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS store_name TEXT,
  ADD COLUMN IF NOT EXISTS store_category TEXT,
  ADD COLUMN IF NOT EXISTS is_seller BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 3. Create shops table if it doesn't exist
-- =====================================================
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_name TEXT,
  professional_bio TEXT,
  business_address TEXT,
  business_type TEXT,
  industry TEXT,
  operating_hours TEXT,
  portfolio_link TEXT,
  shop_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. Create user_skin_profiles table if it doesn't exist
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_skin_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  latest_analysis_id UUID,
  current_skin_tone TEXT,
  current_undertone TEXT,
  current_skin_type TEXT,
  current_metrics JSONB DEFAULT '{}',
  preferred_products TEXT[] DEFAULT '{}',
  skin_concerns TEXT[] DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. Fix sellers table - make sure foreign keys are correct
-- =====================================================
-- First, check if sellers table exists with correct structure
DO $$ 
BEGIN
  -- If sellers table doesn't exist, create it
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sellers' AND table_schema = 'public') THEN
    CREATE TABLE public.sellers (
      id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
      business_name TEXT,
      shop_name TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      is_verified BOOLEAN DEFAULT FALSE,
      seller_status TEXT DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  ELSE
    -- Add missing columns if they don't exist
    ALTER TABLE public.sellers
      ADD COLUMN IF NOT EXISTS shop_name TEXT,
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS seller_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- =====================================================
-- 6. Create RLS policies for all tables
-- =====================================================
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skin_profiles ENABLE ROW LEVEL SECURITY;

-- Shops policies
CREATE POLICY IF NOT EXISTS "Users can view own shop"
  ON public.shops FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update own shop"
  ON public.shops FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert own shop"
  ON public.shops FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User skin profiles policies
CREATE POLICY IF NOT EXISTS "Users can manage own skin profile"
  ON public.user_skin_profiles FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- 7. Create updated_at trigger function
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. Apply triggers for updated_at
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_shops_updated_at') THEN
    CREATE TRIGGER update_shops_updated_at
    BEFORE UPDATE ON public.shops
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_skin_profiles_updated_at') THEN
    CREATE TRIGGER update_user_skin_profiles_updated_at
    BEFORE UPDATE ON public.user_skin_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- =====================================================
-- 9. Handle new user trigger for profiles
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, profile_completed)
  VALUES (
    NEW.id,
    NEW.email,
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- =====================================================
-- 10. Grant permissions
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.shops TO authenticated;
GRANT ALL ON public.user_skin_profiles TO authenticated;
GRANT ALL ON public.sellers TO authenticated;

-- =====================================================
-- DONE!
-- =====================================================
