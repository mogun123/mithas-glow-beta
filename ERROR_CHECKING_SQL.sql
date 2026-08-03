-- ==========================================
-- COMPREHENSIVE ERROR CHECKING SCRIPT
-- Run this FIRST to identify all potential issues
-- ==========================================

-- Step 1: Check existing table structure
SELECT '=== EXISTING TABLES ===' as info;
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'orders', 'profiles')
ORDER BY table_name, ordinal_position;

-- Step 2: Check if seller_id or seller column exists in products
SELECT '=== SELLER COLUMN CHECK ===' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products' 
AND column_name IN ('seller_id', 'seller');

-- Step 3: Check if variant-related tables already exist
SELECT '=== VARIANT TABLES CHECK ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%variant%' OR table_name LIKE '%inventory%'
ORDER BY table_name;

-- Step 4: Check for potential conflicts
SELECT '=== POTENTIAL CONFLICTS ===' as info;
SELECT 
    'products table has variant-level columns' as issue,
    COUNT(*) as count
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products' 
AND column_name IN ('price', 'stock', 'size_options', 'color_options', 'sku', 'in_stock')

UNION ALL

SELECT 
    'Missing required columns in products' as issue,
    COUNT(*) as count
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'products' 
AND column_name IN ('status', 'vto_status', 'three_d_enabled', 'glow_bid_eligible')
HAVING COUNT(*) < 4;

-- Step 5: Check orders table structure
SELECT '=== ORDERS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'orders'
ORDER BY ordinal_position;

-- Step 6: Test view creation logic (this will show errors)
SELECT '=== VIEW CREATION TEST ===' as info;

-- Test the CASE statement logic
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public') 
        THEN 'seller_id exists'
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller' AND table_schema = 'public') 
        THEN 'seller exists'
        ELSE 'no seller column found'
    END as seller_column_status;

-- Step 7: Check for UUID extension
SELECT '=== UUID EXTENSION CHECK ===' as info;
SELECT extname, extversion FROM pg_extension WHERE extname = 'uuid-ossp';

-- Step 8: Check foreign key constraints
SELECT '=== FOREIGN KEY CONSTRAINTS ===' as info;
SELECT
    tc.table_name, 
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
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public'
AND tc.table_name IN ('products', 'orders');

-- Step 9: Check indexes
SELECT '=== EXISTING INDEXES ===' as info;
SELECT indexname, tablename, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'orders')
ORDER BY tablename, indexname;

-- Step 10: Sample data check
SELECT '=== SAMPLE DATA CHECK ===' as info;
SELECT 
    'products' as table_name,
    COUNT(*) as record_count
FROM public.products

UNION ALL

SELECT 
    'orders' as table_name,
    COUNT(*) as record_count
FROM public.orders

UNION ALL

SELECT 
    'profiles' as table_name,
    COUNT(*) as record_count
FROM public.profiles;

-- Step 11: RLS Status Check
SELECT '=== RLS STATUS ===' as info;
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('products', 'orders', 'profiles');

-- ==========================================
-- RUN THIS FIRST TO IDENTIFY ALL ISSUES
-- ==========================================
