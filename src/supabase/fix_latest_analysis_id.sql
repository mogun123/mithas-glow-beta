-- Fix missing latest_analysis_id column in user_skin_profiles table
-- Run this script to add the missing column

-- Check if column exists and add it if missing
DO $$
BEGIN
    -- Check if latest_analysis_id column exists in user_skin_profiles table
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_skin_profiles' 
        AND column_name = 'latest_analysis_id' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'latest_analysis_id column already exists';
    ELSE
        -- Add the missing column
        ALTER TABLE public.user_skin_profiles 
        ADD COLUMN latest_analysis_id UUID REFERENCES public.clinical_analyses(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'latest_analysis_id column added successfully';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_skin_profiles' 
AND table_schema = 'public'
AND column_name = 'latest_analysis_id';
