-- ==========================================
-- COMPREHENSIVE SELLER PLATFORM ANALYSIS
-- Check all database tables and relationships for seller platform
-- ==========================================

-- Step 1: Check all existing tables
SELECT '=== ALL TABLES IN PUBLIC SCHEMA ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Step 2: Check foreign key relationships
SELECT '=== FOREIGN KEY RELATIONSHIPS ===' as info;
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
ORDER BY tc.table_name, kcu.column_name;

-- Step 3: Check profiles table structure (for user management)
SELECT '=== PROFILES TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 4: Check sellers table structure (for seller management)
SELECT '=== SELLERS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'sellers'
ORDER BY ordinal_position;

-- Step 5: Check products table structure (for inventory)
SELECT '=== PRODUCTS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;

-- Step 6: Check orders table structure (for order management)
SELECT '=== ORDERS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- Step 7: Check for advanced inventory tables
SELECT '=== ADVANCED INVENTORY TABLES ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('product_variants', 'inventory', 'inventory_logs', 'order_items', 'variant_sales')
ORDER BY table_name;

-- Step 8: Check for onboarding/setup tables
SELECT '=== ONBOARDING TABLES ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('seller_onboarding', 'shop_setup', 'verification_requests')
ORDER BY table_name;

-- Step 9: Check for analytics tables
SELECT '=== ANALYTICS TABLES ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('seller_analytics', 'sales_metrics', 'performance_data')
ORDER BY table_name;

-- Step 10: Sample data check
SELECT '=== SAMPLE DATA COUNTS ===' as info;

SELECT 
    'profiles' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN is_seller = true THEN 1 END) as seller_count
FROM public.profiles

UNION ALL

SELECT 
    'sellers' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_count
FROM public.sellers

UNION ALL

SELECT 
    'products' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count
FROM public.products

UNION ALL

SELECT 
    'orders' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM public.orders;

-- Step 11: Check RLS policies
SELECT '=== RLS POLICIES ===' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Step 12: Check for missing critical seller columns
SELECT '=== CRITICAL SELLER COLUMNS CHECK ===' as info;

SELECT 
    'profiles.seller_id' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'seller_id' AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 
    'profiles.is_seller' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_seller' AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 
    'products.seller_id' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'seller_id' AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 
    'orders.seller_id' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'seller_id' AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 
    'orders.buyer_id' as column_check,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'buyer_id' AND table_schema = 'public'
    ) THEN 'EXISTS' ELSE 'MISSING' END as status;
