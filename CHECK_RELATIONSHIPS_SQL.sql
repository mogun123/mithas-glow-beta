-- ==========================================
-- DATABASE RELATIONSHIP CHECKER
-- Check existing foreign key relationships
-- ==========================================

-- Check all foreign key relationships
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
AND (tc.table_name IN ('orders', 'products', 'profiles') OR ccu.table_name IN ('orders', 'products', 'profiles'))
ORDER BY tc.table_name, kcu.column_name;

-- Check orders table structure
SELECT '=== ORDERS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;

-- Check products table structure  
SELECT '=== PRODUCTS TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'products'
ORDER BY ordinal_position;

-- Check profiles table structure
SELECT '=== PROFILES TABLE STRUCTURE ===' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
