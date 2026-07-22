-- ==========================================
-- SELLERS TABLE COLUMN CHECK
-- Check what columns actually exist in the sellers table
-- ==========================================

-- Check sellers table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sellers' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if the table exists at all
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'sellers' 
    AND table_schema = 'public';

-- Show sample data if table exists
SELECT * FROM public.sellers LIMIT 1;
