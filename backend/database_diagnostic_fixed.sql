-- DATABASE DIAGNOSTIC SCRIPT FOR MITHAS GLOW (FIXED)
-- Run this first to check what's actually in your Supabase database

-- =====================================================
-- CHECK WHAT TABLES EXIST
-- =====================================================
SELECT 'EXISTING TABLES' as info, table_name, table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- =====================================================
-- CHECK PROFILES TABLE STRUCTURE
-- =====================================================
SELECT 'PROFILES COLUMNS' as info, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- CHECK IF SHOPS TABLE EXISTS
-- =====================================================
SELECT 'SHOPS TABLE CHECK' as info, 
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shops' AND table_schema = 'public') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status;

-- =====================================================
-- CHECK SHOPS TABLE STRUCTURE (IF EXISTS)
-- =====================================================
SELECT 'SHOPS COLUMNS' as info, column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'shops' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================
SELECT 'FOREIGN KEYS' as info, 
       tc.table_name, 
       tc.constraint_name, 
       kcu.column_name, 
       ccu.table_name AS foreign_table_name,
       ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';

-- =====================================================
-- CHECK RLS STATUS
-- =====================================================
SELECT 'RLS STATUS' as info, tablename, rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('profiles', 'shops', 'products', 'orders')
ORDER BY tablename;

-- =====================================================
-- CHECK EXISTING POLICIES
-- =====================================================
SELECT 'EXISTING POLICIES' as info, schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =====================================================
-- SAMPLE DATA CHECK (SAFE VERSION)
-- =====================================================
SELECT 'PROFILES SAMPLE' as info, id, email, created_at
FROM profiles 
LIMIT 3;

-- Only show shops sample if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shops' AND table_schema = 'public') THEN
        RAISE NOTICE 'Shops table exists, showing sample data';
        -- This will show in the messages, not as a result
    END IF;
END $$;

-- =====================================================
-- CHECK FOR MISSING COLUMNS (SAFE VERSION)
-- =====================================================
SELECT 'MISSING COLUMNS CHECK' as info, 
       'user_type' as column_name,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_type' AND table_schema = 'public') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status
UNION ALL
SELECT 'MISSING COLUMNS CHECK' as info, 
       'latitude' as column_name,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'latitude' AND table_schema = 'public') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status
UNION ALL
SELECT 'MISSING COLUMNS CHECK' as info, 
       'longitude' as column_name,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'longitude' AND table_schema = 'public') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status
UNION ALL
SELECT 'MISSING COLUMNS CHECK' as info, 
       'updated_at' as column_name,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at' AND table_schema = 'public') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status
UNION ALL
SELECT 'MISSING COLUMNS CHECK' as info, 
       'profile_completed' as column_name,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_completed' AND table_schema = 'public') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status
UNION ALL
SELECT 'MISSING COLUMNS CHECK' as info, 
       'is_seller' as column_name,
       CASE 
         WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_seller' AND table_schema = 'public') 
         THEN 'EXISTS' 
         ELSE 'MISSING' 
       END as status;

-- =====================================================
-- CHECK WHAT COLUMNS ACTUALLY EXIST IN PROFILES
-- =====================================================
SELECT string_agg(column_name, ', ' ORDER BY ordinal_position) as existing_columns
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public';
